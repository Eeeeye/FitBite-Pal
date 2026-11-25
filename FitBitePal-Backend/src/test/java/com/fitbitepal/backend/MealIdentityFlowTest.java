package com.fitbitepal.backend;

import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.dto.CompletionItemRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.service.*;
import com.fitbitepal.backend.util.JwtUtil;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.*;

@AutoConfigureMockMvc
@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_TEST_DB_URL:jdbc:h2:mem:mealIds;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE,DAY}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER:sa}", "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=${FITBITE_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.jpa.properties.hibernate.dialect=${FITBITE_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "logging.level.org.hibernate=WARN"
})
@Import(BackendFlowTest.LocalCache.class)
class MealIdentityFlowTest {
    @MockitoBean FoodItemInitializer food;
    @MockitoBean ExerciseInitializer exercises;
    @Autowired UserRepository users;
    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtUtil tokens;
    @Autowired DietRecordRepository manual;
    @Autowired DietPlanRepository diet;
    @Autowired CompletionRecordRepository rows;
    @Autowired ActivityRecordService writer;
    @Autowired CompletionService completions;
    @Autowired ProgressReportService progress;
    @Autowired UserService profiles;
    private User user;
    private final LocalDate date = LocalDate.now();

    @BeforeEach void setUp() {
        User created = new User();
        created.setUsername(UUID.randomUUID().toString());
        created.setEmail(created.getUsername() + "@example.test");
        created.setPassword("fixture");
        user = users.saveAndFlush(created);
    }

    @Test void removingEarlierMealsKeepsChecksAndDeletingTheCheckedSourceClearsOnlyItsOwnLog() {
        var breakfast = plan("08:00", "Oats");
        var lunch = plan("12:30", "Rice");
        var first = custom("Soup");
        var second = custom("Bread");
        var lunchCheck = save("plan:" + lunch.getId(), 1);
        var breadCheck = save("record:" + second.getId(), 3);
        assertThat(lunchCheck.getId()).isNotEqualTo(breadCheck.getId());
        writer.hidePlannedMeal(user.getId(), breakfast.getId());
        writer.deleteDiet(first.getId(), user);

        var report = progress.progress(user.getId(), 1, date, user);
        assertThat(report.mealCompletions()).containsExactlyInAnyOrderEntriesOf(java.util.Map.of(0, true, 1, true));
        assertThat(report.mealCompletionsByKey()).containsOnlyKeys(lunchCheck.getMealKey(), breadCheck.getMealKey());
        assertThat(completions.list(user.getId(), date, "meal")).extracting(CompletionRecord::getItemIndex)
                .containsExactlyInAnyOrder(0, 1);

        writer.hidePlannedMeal(user.getId(), lunch.getId());
        assertThat(profiles.getDietPlanByDate(user.getId(), date)).isEmpty();
        assertThat(rows.findById(lunchCheck.getId())).isEmpty();
        assertThat(rows.findById(breadCheck.getId())).isPresent();
        writer.deleteDiet(second.getId(), user);
        assertThat(rows.findById(breadCheck.getId())).isEmpty();
        assertThatThrownBy(() -> save(breadCheck.getMealKey(), 3)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void oldClientMatchesTheVisibleSourceAndAmbiguousOrStaleRequestsCannotMoveAnotherCheck() {
        plan("08:00", "Oats");
        var lunch = plan("12:30", "Rice");
        var legacy = item(null, 1);
        legacy.setItemName("12:30");
        legacy.setCalories(410);
        var row = completions.save(user.getId(), date, "meal", legacy);
        assertThat(row.getMealKey()).isEqualTo("plan:" + lunch.getId());
        assertThat(save(row.getMealKey(), 7).getId()).isEqualTo(row.getId());
        plan("12:30", "Rice");
        assertThatThrownBy(() -> completions.save(user.getId(), date, "meal", legacy))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> completions.save(user.getId(), date.plusDays(1), "meal", item(row.getMealKey(), 1)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void duplicateConcurrentTogglesShareOneRowAndAnUnresolvedHistoricalSlotCannotCheckANewMeal() throws Exception {
        var legacy = completions.save(user.getId(), date, "meal", item(null, 0));
        var meal = plan("08:00", "New menu");
        var key = "plan:" + meal.getId();
        var before = progress.progress(user.getId(), 1, date, user);
        assertThat(before.mealCompletionsByKey()).containsOnlyKeys("legacy:" + legacy.getId());
        assertThat(before.mealCompletions()).isEmpty();
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            java.util.concurrent.Callable<Long> write = () -> {
                start.await(5, TimeUnit.SECONDS);
                return save(key, 0).getId();
            };
            var a = pool.submit(write);
            var b = pool.submit(write);
            start.countDown();
            assertThat(a.get(10, TimeUnit.SECONDS)).isEqualTo(b.get(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
        List<CompletionRecord> saved = completions.list(user.getId(), date, "meal");
        assertThat(saved).hasSize(2).filteredOn(row -> key.equals(row.getMealKey())).hasSize(1);
        diet.deleteById(meal.getId());
        var replacement = plan("08:00", "New menu");
        assertThat(progress.progress(user.getId(), 1, date, user).mealCompletionsByKey())
                .doesNotContainKeys(key, "plan:" + replacement.getId());
        assertThat(completions.list(user.getId(), date, "meal")).extracting(CompletionRecord::getMealKey)
                .doesNotContain(key);
        assertThat(completions.list(user.getId(), null, "meal")).extracting(CompletionRecord::getMealKey)
                .contains(key);
    }

    @Test void httpUsesSourceQualifiedIdsEvenWhenBothTablesHaveTheSameId() throws Exception {
        long id = 1000000L + user.getId();
        jdbc.update("insert into diet_plans(id,user_id,plan_date,meal_type,meal_time,meal_name,calories,created_at,hidden)"
                + " values (?,?,?,'Breakfast','08:00','Oats',125,current_timestamp,false)", id, user.getId(), date);
        jdbc.update("insert into diet_records(id,user_id,recorded_at,food_name,calories) values (?,?,?,'Milk',175)",
                id, user.getId(), date.atTime(9, 0));
        String bearer = "Bearer " + tokens.generateToken(user.getId(), user.getUsername());
        for (String key : List.of("plan:" + id, "record:" + id)) {
            http.perform(post("/completion/save").header("Authorization", bearer)
                    .contentType(MediaType.APPLICATION_JSON).content("""
                            {"userId":%d,"date":"%s","itemType":"meal","mealKey":"%s","completed":true}
                            """.formatted(user.getId(), date, key)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.mealKey").value(key));
        }
        http.perform(delete("/users/{userId}/diet-plan/{planId}", user.getId(), id).header("Authorization", bearer))
                .andExpect(status().isOk());
        http.perform(get("/completion/records").header("Authorization", bearer).param("itemType", "meal")
                        .param("date", date.toString()).param("userId", user.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].itemIndex").value(0))
                .andExpect(jsonPath("$.data[0].mealKey").value("record:" + id));
        http.perform(post("/completion/save").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"userId":%d,"date":"%s","itemType":"meal","mealKey":"plan:%d","completed":true}
                        """.formatted(user.getId(), date, id))).andExpect(status().isNotFound());
    }

    private CompletionRecord save(String key, int index) {
        return completions.save(user.getId(), date, "meal", item(key, index));
    }

    private CompletionItemRequest item(String key, Integer index) {
        var input = new CompletionItemRequest();
        input.setMealKey(key);
        input.setItemIndex(index);
        input.setCompleted(true);
        return input;
    }

    private DietPlan plan(String time, String name) {
        var plan = new DietPlan();
        plan.setUserId(user.getId());
        plan.setPlanDate(date);
        plan.setMealType("Meal");
        plan.setMealTime(time);
        plan.setMealName(name);
        plan.setCalories(410);
        return diet.saveAndFlush(plan);
    }

    private DietRecord custom(String name) {
        var record = new DietRecord();
        record.setFoodName(name);
        record.setCalories(210);
        record.setUserId(user.getId());
        return manual.saveAndFlush(record);
    }
}
