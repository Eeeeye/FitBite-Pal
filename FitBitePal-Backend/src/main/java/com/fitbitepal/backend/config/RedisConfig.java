package com.fitbitepal.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.lang.NonNull;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis 缓存配置
 * 用于热点数据缓存，提高系统性能
 */
@Configuration
@EnableCaching
public class RedisConfig {

    // 缓存名称常量
    public static final String CACHE_USER = "userCache";
    public static final String CACHE_TRAINING_PLAN = "trainingPlanCache";
    public static final String CACHE_DIET_PLAN = "dietPlanCache";
    public static final String CACHE_COMPLETION = "completionCache";

    /**
     * 创建支持 Java 8 日期时间的 ObjectMapper
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // ✅ 注册 Java 8 日期时间模块
        mapper.registerModule(new JavaTimeModule());
        // ✅ 禁用将日期写为时间戳
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // ✅ 启用默认类型信息（用于多态序列化）
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        return mapper;
    }

    /**
     * 创建支持 Java 8 日期的序列化器
     */
    private GenericJackson2JsonRedisSerializer createJsonSerializer() {
        return new GenericJackson2JsonRedisSerializer(createObjectMapper());
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(@NonNull RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer keySerializer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer valueSerializer = createJsonSerializer();

        template.setKeySerializer(keySerializer);
        template.setValueSerializer(valueSerializer);
        template.setHashKeySerializer(keySerializer);
        template.setHashValueSerializer(valueSerializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisCacheManager redisCacheManager(@NonNull RedisConnectionFactory connectionFactory) {
        // ✅ 使用支持 Java 8 日期的序列化器
        GenericJackson2JsonRedisSerializer jsonSerializer = createJsonSerializer();
        
        // 默认缓存配置（10分钟过期）
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer))
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues();

        // 不同缓存的自定义配置
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        
        // 用户缓存：24小时过期
        cacheConfigs.put(CACHE_USER, defaultConfig.entryTtl(Duration.ofHours(24)));
        
        // 训练计划缓存：12小时过期
        cacheConfigs.put(CACHE_TRAINING_PLAN, defaultConfig.entryTtl(Duration.ofHours(12)));
        
        // 饮食计划缓存：12小时过期
        cacheConfigs.put(CACHE_DIET_PLAN, defaultConfig.entryTtl(Duration.ofHours(12)));
        
        // 完成状态缓存：6小时过期
        cacheConfigs.put(CACHE_COMPLETION, defaultConfig.entryTtl(Duration.ofHours(6)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}

