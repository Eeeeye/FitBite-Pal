package com.fitbitepal.backend.service;

import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.dto.PlanAdjustmentRequest;
import com.fitbitepal.backend.model.MealSet;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.MealSetRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import com.fitbitepal.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static com.fitbitepal.backend.config.RedisConfig.CACHE_PLAN_VERSION;
import static com.fitbitepal.backend.config.RedisConfig.CACHE_TRAINING_PLAN;
import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_DB_URL", matches = "jdbc:mysql:.*")
@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_REDIS_PORT", matches = "[0-9]+")
@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_TEST_DB_URL}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER}", "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD}",
        "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect",
        "spring.data.redis.database=13", "spring.data.redis.host=127.0.0.1",
        "spring.data.redis.port=${FITBITE_TEST_REDIS_PORT}", "spring.jpa.show-sql=false",
        "logging.level.org.hibernate=WARN", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class PublishedPlanConcurrencyTest {
    @MockitoBean FoodItemInitializer foods;
    @MockitoBean ExerciseInitializer exercises;
    @Autowired TransactionTemplate tx;
    @Autowired UserRepository users;
    @Autowired MealSetRepository meals;
    @Autowired TrainingPlanRepository plans;
    @Autowired DailyPlanService daily;
    @Autowired PublishedPlanReader reader;
    @Autowired UserService profiles;
    @Autowired TrainingAdjustmentService adjustments;
    @Autowired CacheManager caches;

    private Long id;
    private final LocalDate today = LocalDate.now();

    @BeforeEach
    void seed() {
        User user = new User();
        user.setUsername(UUID.randomUUID().toString());
        user.setEmail(user.getUsername() + "@example.test");
        user.setPassword("test");
        user.setHeight(173.0);
        user.setWeight(70.0);
        user.setTrainingDuration(30);
        id = users.saveAndFlush(user).getId();
        if (meals.count() == 0) {
            for (String type : List.of("Breakfast", "Lunch", "Dinner")) {
                MealSet meal = new MealSet();
                meal.setName(type);
                meal.setMealType(type);
                meal.setCalories(400);
                meals.saveAndFlush(meal);
            }
        }
        daily.prepare(id, today);
        profiles.evictAllUserCaches(id);
    }

    @Test
    void coldPublishedReadsCompleteWhileAWriterHoldsTheUserLock() throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try {
            var writer = pool.submit(() -> tx.executeWithoutResult(status -> {
                users.findForUpdate(id).orElseThrow();
                locked.countDown();
                await(release);
            }));
            await(locked);
            var reads = pool.submit(() -> {
                assertThat(profiles.getTrainingPlanByDate(id, today)).isNotEmpty();
                assertThat(profiles.getDietPlanByDate(id, today)).hasSize(3);
            });
            reads.get(5, TimeUnit.SECONDS);
            release.countDown();
            writer.get(5, TimeUnit.SECONDS);
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void aLateCacheFillCannotRestoreThePlanReplacedByAnotherTransaction() throws Exception {
        var pool = Executors.newSingleThreadExecutor();
        var selected = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try {
            var slowReader = pool.submit(() -> reader.read(CACHE_TRAINING_PLAN, id, today, () -> {
                var rows = plans.findByUserIdAndPlanDateOrderByOrderIndexAsc(id, today);
                selected.countDown();
                await(release);
                return rows;
            }, ignored -> { throw new AssertionError("Expected published rows"); }));
            await(selected);
            assertThat(adjustments.adjust(id, new PlanAdjustmentRequest(45, null, null), today).success()).isTrue();
            release.countDown();
            var old = slowReader.get(5, TimeUnit.SECONDS);
            var current = plans.findByUserIdAndPlanDateOrderByOrderIndexAsc(id, today);
            assertThat(current).isNotEmpty().extracting(TrainingPlan::getId)
                    .doesNotContainAnyElementsOf(old.stream().map(TrainingPlan::getId).toList());
            assertThat(profiles.getTrainingPlanByDate(id, today)).isEqualTo(current);
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void rollbackPreservesTheWarmPlanAndItsGeneration() {
        var first = profiles.getTrainingPlanByDate(id, today);
        var versions = caches.getCache(CACHE_PLAN_VERSION);
        String before = versions.get(id, String.class);
        tx.executeWithoutResult(status -> {
            assertThat(adjustments.adjust(id, new PlanAdjustmentRequest(45, null, null), today).success()).isTrue();
            assertThat(versions.get(id, String.class)).isEqualTo(before);
            status.setRollbackOnly();
        });
        assertThat(before).isNotNull().isEqualTo(versions.get(id, String.class));
        assertThat(profiles.getTrainingPlanByDate(id, today)).isEqualTo(first);
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(15, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
