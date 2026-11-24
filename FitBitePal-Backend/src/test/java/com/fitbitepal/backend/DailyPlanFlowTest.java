package com.fitbitepal.backend;

import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.dto.UserProfileRequest;
import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.service.CalorieSnapshotService;
import com.fitbitepal.backend.service.DailyPlanService;
import com.fitbitepal.backend.service.UserService;
import com.fitbitepal.backend.scheduler.PlanGenerationScheduler;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.support.ScheduledMethodRunnable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_TEST_DB_URL:jdbc:h2:mem:plans;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE,DAY}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER:sa}",
        "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=${FITBITE_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.jpa.properties.hibernate.dialect=${FITBITE_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.show-sql=false", "logging.level.org.hibernate=WARN", "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(BackendFlowTest.LocalCache.class)
class DailyPlanFlowTest {
    @MockBean FoodItemInitializer foodInitializer;
    @MockBean ExerciseInitializer exerciseInitializer;
    @Autowired UserRepository users;
    @Autowired MealSetRepository menu;
    @Autowired TrainingPlanRepository training;
    @Autowired DietPlanRepository diet;
    @Autowired CompletionRecordRepository completions;
    @Autowired CalorieRecordRepository calories;
    @Autowired DailyPlanService daily;
    @Autowired CalorieSnapshotService snapshots;
    @Autowired UserService profiles;
    @Autowired DietRecordRepository manualDiet;
    @Autowired ScheduledAnnotationBeanPostProcessor scheduledJobs;
    @Autowired JdbcTemplate jdbc;
    private User user;
    private final LocalDate today = LocalDate.now();

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername(UUID.randomUUID().toString());
        user.setEmail(user.getUsername() + "@example.test");
        user.setPassword("fixture");
        user.setHeight(173.0);
        user.setWeight(70.0);
        user.setBmr(1600);
        user = users.saveAndFlush(user);
        if (menu.count() == 0) {
            for (String type : List.of("Breakfast", "Lunch", "Dinner")) {
                MealSet meal = new MealSet();
                meal.setName(type + " menu");
                meal.setMealType(type);
                meal.setGoalType("Keep fit");
                meal.setCalories(400);
                menu.saveAndFlush(meal);
            }
        }
    }

    @Test
    void repeatedProfileSavesPreserveDatedHistoryAndPublishedPlans() {
        LocalDate yesterday = today.minusDays(1);
        daily.prepare(user.getId(), yesterday);
        List<Long> history = dietIds(yesterday);
        assertThat(history).hasSize(3);

        UserProfileRequest request = new UserProfileRequest();
        request.setGender("Male");
        request.setAge(25);
        request.setHeight(173.0);
        request.setWeight(69.0);
        request.setActivityLevel("Beginner");
        request.setGoal("Keep fit");
        request.setTrainingDuration(30);
        profiles.saveUserProfile(user.getId(), request);
        List<Long> published = dietIds(today);
        List<Long> exercises = exerciseIds(today);
        List<Long> templates = diet.findByUserIdAndPlanDateIsNullOrderByIdAsc(user.getId())
                .stream().map(DietPlan::getId).toList();
        request.setWeight(68.0);
        profiles.saveUserProfile(user.getId(), request);

        assertThat(dietIds(yesterday)).isEqualTo(history);
        assertThat(dietIds(today)).hasSize(3).isEqualTo(published);
        assertThat(exerciseIds(today)).isNotEmpty().isEqualTo(exercises);
        assertThat(diet.findByUserIdAndPlanDateIsNullOrderByIdAsc(user.getId()))
                .hasSize(3).extracting(DietPlan::getId).containsExactlyElementsOf(templates);
        assertThat(profiles.getDietPlan(user.getId())).hasSize(6);
    }

    @Test
    void concurrentFirstReadsAndNightlyGenerationPublishOneSetOfRows() throws Exception {
        LocalDate date = today.plusDays(1);
        var pool = Executors.newFixedThreadPool(3);
        CountDownLatch gate = new CountDownLatch(1);
        try {
            var train = pool.submit(() -> {
                gate.await();
                return profiles.getTrainingPlanByDate(user.getId(), date);
            });
            var meals = pool.submit(() -> {
                gate.await();
                return profiles.getDietPlanByDate(user.getId(), date);
            });
            var nightly = pool.submit(() -> {
                gate.await();
                daily.prepare(user.getId(), date);
                return true;
            });
            gate.countDown();
            List<TrainingPlan> readTraining = train.get(15, TimeUnit.SECONDS);
            List<DietPlan> readDiet = meals.get(15, TimeUnit.SECONDS);
            nightly.get(15, TimeUnit.SECONDS);
            daily.prepare(user.getId(), date);
            assertThat(readTraining).isNotEmpty().extracting(TrainingPlan::getOrderIndex).doesNotHaveDuplicates();
            assertThat(readDiet).hasSize(3).extracting(DietPlan::getMealType).doesNotHaveDuplicates();
            assertThat(exerciseIds(date)).containsExactlyElementsOf(readTraining.stream().map(TrainingPlan::getId).toList());
            assertThat(dietIds(date)).containsExactlyElementsOf(readDiet.stream().map(DietPlan::getId).toList());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void historyReadsNeverCreatePlansForAnUnrelatedDay() {
        assertThat(profiles.getTrainingPlanByDate(user.getId(), today.minusMonths(2))).isEmpty();
        assertThat(profiles.getDietPlanByDate(user.getId(), today.minusMonths(2))).isEmpty();
        assertThat(exerciseIds(today)).isEmpty();
        assertThat(dietIds(today)).isEmpty();
    }

    @Test
    void dailyJobPreservesPreviousDaysManualFoodHistory() {
        DietRecord entry = new DietRecord();
        entry.setUserId(user.getId());
        entry.setFoodName("Rice");
        entry.setMealType("Lunch");
        entry.setCalories(360);
        manualDiet.saveAndFlush(entry);
        jdbc.update("update diet_records set recorded_at=? where id=?",
                today.minusDays(1).atTime(12, 0), entry.getId());
        var jobs = scheduledJobs.getScheduledTasks().stream()
                .map(task -> task.getTask().getRunnable())
                .filter(ScheduledMethodRunnable.class::isInstance)
                .map(ScheduledMethodRunnable.class::cast)
                .filter(job -> job.getTarget() instanceof PlanGenerationScheduler)
                .toList();
        assertThat(jobs).isNotEmpty();
        jobs.forEach(ScheduledMethodRunnable::run);
        assertThat(manualDiet.findByUserIdAndRecordedAtBetween(user.getId(),
                today.minusDays(1).atStartOfDay(), today.atStartOfDay()))
                .extracting(DietRecord::getId).containsExactly(entry.getId());
    }

    @Test
    void calorieSnapshotUsesCompletedTotalsAndManualRecalculationKeepsIdentity() {
        addCompletion("exercise", 0, true, 250);
        addCompletion("exercise", 1, false, 100);
        addCompletion("meal", 0, true, 400);
        snapshots.createIfAbsent(user.getId(), today);
        var result = calories.findByUserIdAndRecordDate(user.getId(), today).orElseThrow();
        assertThat(result.getCalorieExpenditure()).isEqualTo(1850);
        assertThat(result.getCalorieIntake()).isEqualTo(400);
        addCompletion("meal", 1, true, 200);
        snapshots.createIfAbsent(user.getId(), today);
        assertThat(calories.findById(result.getId()).orElseThrow().getCalorieIntake()).isEqualTo(400);
        var updated = snapshots.recalculate(user.getId(), today);
        assertThat(updated.getId()).isEqualTo(result.getId());
        assertThat(updated.getCalorieIntake()).isEqualTo(600);
    }

    private List<Long> exerciseIds(LocalDate date) {
        return training.findByUserIdAndPlanDateOrderByOrderIndexAsc(user.getId(), date)
                .stream().map(TrainingPlan::getId).toList();
    }

    private List<Long> dietIds(LocalDate date) {
        return diet.findByUserIdAndPlanDateOrderByMealTimeAsc(user.getId(), date)
                .stream().map(DietPlan::getId).toList();
    }

    private void addCompletion(String type, int index, boolean done, int kcal) {
        CompletionRecord record = new CompletionRecord();
        record.setUserId(user.getId());
        record.setRecordDate(today);
        record.setItemType(type);
        record.setItemIndex(index);
        record.setCompleted(done);
        record.setCalories(kcal);
        completions.saveAndFlush(record);
    }
}
