package com.fitbitepal.backend;

import com.fitbitepal.backend.config.RedisConfig;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_REDIS_PORT", matches = "[0-9]+")
class RedisCacheContractTest {
    @Test
    void readsTypedProfilesAndPlansWithoutPasswordsOrJavaClassNames() {
        int port = Integer.parseInt(System.getenv("FITBITE_TEST_REDIS_PORT"));
        var connection = new LettuceConnectionFactory("127.0.0.1", port);
        connection.afterPropertiesSet();
        try {
            var manager = new RedisConfig().redisCacheManager(connection);
            manager.afterPropertiesSet();
            var redis = new StringRedisTemplate(connection);
            var key = UUID.randomUUID().toString();
            var user = new User();
            user.setEmail("cache@example.test");
            user.setPassword("excluded-from-cache");
            var training = new TrainingPlan();
            training.setPlanDate(LocalDate.of(2026, 1, 1));
            var diet = new DietPlan();
            diet.setMealName("Breakfast");
            var profiles = manager.getCache(RedisConfig.CACHE_USER);
            var workouts = manager.getCache(RedisConfig.CACHE_TRAINING_PLAN);
            var meals = manager.getCache(RedisConfig.CACHE_DIET_PLAN);
            try {
                profiles.put(key, user);
                workouts.put(key, List.of(training));
                meals.put(key, List.of(diet));
                assertThat(profiles.get(key, User.class).getEmail()).isEqualTo(user.getEmail());
                assertThat(workouts.get(key, List.class)).containsExactly(training);
                assertThat(meals.get(key, List.class)).containsExactly(diet);
                String stored = redis.opsForValue().get("fitbite:v2:userCache::" + key);
                assertThat(stored).contains(user.getEmail()).doesNotContain("password", user.getPassword(), User.class.getName());
            } finally {
                profiles.evict(key);
                workouts.evict(key);
                meals.evict(key);
            }
        } finally {
            connection.destroy();
        }
    }
}
