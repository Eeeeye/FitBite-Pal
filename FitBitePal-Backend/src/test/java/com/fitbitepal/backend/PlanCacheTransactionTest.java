package com.fitbitepal.backend;

import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.dto.UserProfileRequest;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.service.UserService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import static com.fitbitepal.backend.config.RedisConfig.*;
import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_REDIS_PORT", matches = "[0-9]+")
@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.data.redis.database=15", "spring.data.redis.host=127.0.0.1", "spring.data.redis.port=${FITBITE_TEST_REDIS_PORT}",
        "spring.datasource.url=jdbc:h2:mem:planCache;MODE=MySQL;NON_KEYWORDS=VALUE,DAY",
        "spring.jpa.show-sql=false", "logging.level.org.hibernate=WARN"
})
class PlanCacheTransactionTest {
    @MockitoBean FoodItemInitializer foods;
    @MockitoBean ExerciseInitializer exercises;
    @Autowired CacheManager caches;
    @Autowired TransactionTemplate transactions;
    @Autowired UserService profiles;
    @Autowired UserRepository users;

    private record Entry(String cache, Object key, Object value) {}

    @Test
    void commitsEvictOnlyAffectedKeysAndRollbacksPreservePublishedData() {
        User user = new User();
        user.setUsername(UUID.randomUUID().toString());
        user.setEmail(user.getUsername() + "@example.test");
        user.setPassword("fixture");
        Long id = users.saveAndFlush(user).getId();
        var profile = new Entry(CACHE_USER, id, user);
        LocalDate today = LocalDate.now();
        var current = List.of(
                new Entry(CACHE_TRAINING_PLAN, id + ":" + today, List.of(new TrainingPlan())),
                new Entry(CACHE_TRAINING_PLAN, id + ":" + today.plusDays(1), List.of(new TrainingPlan())),
                new Entry(CACHE_DIET_PLAN, id + ":" + today, List.of(new DietPlan())),
                new Entry(CACHE_DIET_PLAN, id + ":" + today.plusDays(1), List.of(new DietPlan())));
        var otherUser = new Entry(CACHE_DIET_PLAN, -id + ":" + today, List.of(new DietPlan()));
        try {
            put(profile);
            current.forEach(this::put);
            put(otherUser);
            transactions.executeWithoutResult(tx -> {
                profiles.evictAllUserCaches(id);
                assertThat(present(profile)).isTrue();
                assertThat(current).allMatch(this::present);
                tx.setRollbackOnly();
            });
            assertThat(present(profile)).isTrue();
            assertThat(current).allMatch(this::present);

            UserProfileRequest request = new UserProfileRequest();
            request.setGender("Male");
            request.setAge(24);
            request.setHeight(173.0);
            request.setWeight(68.0);
            request.setActivityLevel("Beginner");
            request.setGoal("Keep fit");
            request.setTrainingDuration(30);
            // Eviction is deferred even when the profile service participates in an outer transaction.
            transactions.executeWithoutResult(tx -> {
                profiles.saveUserProfile(id, request);
                assertThat(present(profile)).isTrue();
            });
            assertThat(present(profile)).isFalse();
            assertThat(current).allMatch(this::present);

            put(profile);
            transactions.executeWithoutResult(tx -> profiles.evictAllUserCaches(id));
            assertThat(present(profile)).isFalse();
            assertThat(current).noneMatch(this::present);
            assertThat(present(otherUser)).isTrue();
        } finally {
            clear(profile);
            current.forEach(this::clear);
            clear(otherUser);
        }
    }

    private void put(Entry entry) {
        caches.getCache(entry.cache()).put(entry.key(), entry.value());
    }

    private boolean present(Entry entry) {
        return caches.getCache(entry.cache()).get(entry.key()) != null;
    }

    private void clear(Entry entry) {
        caches.getCache(entry.cache()).evict(entry.key());
    }
}
