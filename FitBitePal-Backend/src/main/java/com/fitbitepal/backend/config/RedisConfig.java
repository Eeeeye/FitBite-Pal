package com.fitbitepal.backend.config;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    public static final String CACHE_USER = "userCache";
    public static final String CACHE_TRAINING_PLAN = "trainingPlanCache";
    public static final String CACHE_PLAN_VERSION = "publishedPlanVersion";
    public static final String CACHE_DIET_PLAN = "dietPlanCache";

    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connections) {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        var types = mapper.getTypeFactory();
        return RedisCacheManager.builder(connections)
                .withInitialCacheConfigurations(Map.of(
                        CACHE_PLAN_VERSION, cache(mapper, types.constructType(String.class), Duration.ofHours(12)),
                        CACHE_USER, cache(mapper, types.constructType(User.class), Duration.ofHours(24)),
                        CACHE_TRAINING_PLAN, cache(mapper, types.constructCollectionType(List.class, TrainingPlan.class), Duration.ofHours(12)),
                        CACHE_DIET_PLAN, cache(mapper, types.constructCollectionType(List.class, DietPlan.class), Duration.ofHours(12))))
                .disableCreateOnMissingCache()
                .transactionAware()
                .build();
    }

    private RedisCacheConfiguration cache(ObjectMapper mapper, JavaType type, Duration ttl) {
        var serializer = new Jackson2JsonRedisSerializer<>(mapper, type);
        return RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(name -> "fitbite:v2:" + name + "::")
                .serializeValuesWith(SerializationPair.fromSerializer(serializer))
                .disableCachingNullValues()
                .entryTtl(ttl);
    }
}
