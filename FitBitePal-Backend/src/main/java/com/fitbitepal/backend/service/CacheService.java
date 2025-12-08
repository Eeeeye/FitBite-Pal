package com.fitbitepal.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Redis 缓存服务
 * 用于热点数据缓存，提高系统性能
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    // 缓存键前缀
    public static final String USER_PROFILE_PREFIX = "user:profile:";
    public static final String TRAINING_PLAN_PREFIX = "training:plan:";
    public static final String DIET_PLAN_PREFIX = "diet:plan:";
    public static final String COMPLETION_PREFIX = "completion:";
    public static final String CHECK_IN_PREFIX = "checkin:";

    // 默认过期时间
    private static final long DEFAULT_EXPIRE_HOURS = 24;
    private static final long PLAN_EXPIRE_HOURS = 12;
    private static final long COMPLETION_EXPIRE_HOURS = 6;

    /**
     * 设置缓存
     */
    public void set(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, value, DEFAULT_EXPIRE_HOURS, TimeUnit.HOURS);
            log.debug("✅ 缓存设置成功: {}", key);
        } catch (Exception e) {
            log.warn("⚠️ 缓存设置失败: {}, 错误: {}", key, e.getMessage());
        }
    }

    /**
     * 设置缓存（自定义过期时间）
     */
    public void set(String key, Object value, long timeout, TimeUnit unit) {
        try {
            redisTemplate.opsForValue().set(key, value, timeout, unit);
            log.debug("✅ 缓存设置成功: {}, 过期时间: {} {}", key, timeout, unit);
        } catch (Exception e) {
            log.warn("⚠️ 缓存设置失败: {}, 错误: {}", key, e.getMessage());
        }
    }

    /**
     * 获取缓存
     */
    public Object get(String key) {
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                log.debug("✅ 缓存命中: {}", key);
            } else {
                log.debug("❌ 缓存未命中: {}", key);
            }
            return value;
        } catch (Exception e) {
            log.warn("⚠️ 缓存获取失败: {}, 错误: {}", key, e.getMessage());
            return null;
        }
    }

    /**
     * 删除缓存
     */
    public void delete(String key) {
        try {
            redisTemplate.delete(key);
            log.debug("✅ 缓存删除成功: {}", key);
        } catch (Exception e) {
            log.warn("⚠️ 缓存删除失败: {}, 错误: {}", key, e.getMessage());
        }
    }

    /**
     * 批量删除缓存（按前缀）
     */
    public void deleteByPrefix(String prefix) {
        try {
            Set<String> keys = redisTemplate.keys(prefix + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.debug("✅ 批量删除缓存成功, 前缀: {}, 数量: {}", prefix, keys.size());
            }
        } catch (Exception e) {
            log.warn("⚠️ 批量删除缓存失败, 前缀: {}, 错误: {}", prefix, e.getMessage());
        }
    }

    /**
     * 检查缓存是否存在
     */
    public boolean exists(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.warn("⚠️ 检查缓存失败: {}, 错误: {}", key, e.getMessage());
            return false;
        }
    }

    /**
     * 刷新缓存过期时间
     */
    public void refresh(String key, long timeout, TimeUnit unit) {
        try {
            redisTemplate.expire(key, timeout, unit);
            log.debug("✅ 缓存刷新成功: {}", key);
        } catch (Exception e) {
            log.warn("⚠️ 缓存刷新失败: {}, 错误: {}", key, e.getMessage());
        }
    }

    // ==================== 用户资料缓存 ====================

    /**
     * 缓存用户资料
     */
    public void cacheUserProfile(Long userId, Object profile) {
        String key = USER_PROFILE_PREFIX + userId;
        set(key, profile, DEFAULT_EXPIRE_HOURS, TimeUnit.HOURS);
    }

    /**
     * 获取用户资料缓存
     */
    public Object getUserProfile(Long userId) {
        String key = USER_PROFILE_PREFIX + userId;
        return get(key);
    }

    /**
     * 清除用户资料缓存
     */
    public void evictUserProfile(Long userId) {
        String key = USER_PROFILE_PREFIX + userId;
        delete(key);
    }

    // ==================== 训练计划缓存 ====================

    /**
     * 缓存训练计划
     */
    public void cacheTrainingPlan(Long userId, String date, Object plan) {
        String key = TRAINING_PLAN_PREFIX + userId + ":" + date;
        set(key, plan, PLAN_EXPIRE_HOURS, TimeUnit.HOURS);
    }

    /**
     * 获取训练计划缓存
     */
    public Object getTrainingPlan(Long userId, String date) {
        String key = TRAINING_PLAN_PREFIX + userId + ":" + date;
        return get(key);
    }

    /**
     * 清除用户训练计划缓存
     */
    public void evictTrainingPlan(Long userId) {
        String prefix = TRAINING_PLAN_PREFIX + userId + ":";
        deleteByPrefix(prefix);
    }

    // ==================== 饮食计划缓存 ====================

    /**
     * 缓存饮食计划
     */
    public void cacheDietPlan(Long userId, String date, Object plan) {
        String key = DIET_PLAN_PREFIX + userId + ":" + date;
        set(key, plan, PLAN_EXPIRE_HOURS, TimeUnit.HOURS);
    }

    /**
     * 获取饮食计划缓存
     */
    public Object getDietPlan(Long userId, String date) {
        String key = DIET_PLAN_PREFIX + userId + ":" + date;
        return get(key);
    }

    /**
     * 清除用户饮食计划缓存
     */
    public void evictDietPlan(Long userId) {
        String prefix = DIET_PLAN_PREFIX + userId + ":";
        deleteByPrefix(prefix);
    }

    // ==================== 完成状态缓存 ====================

    /**
     * 缓存完成状态
     */
    public void cacheCompletion(Long userId, String date, String itemType, Object data) {
        String key = COMPLETION_PREFIX + userId + ":" + date + ":" + itemType;
        set(key, data, COMPLETION_EXPIRE_HOURS, TimeUnit.HOURS);
    }

    /**
     * 获取完成状态缓存
     */
    public Object getCompletion(Long userId, String date, String itemType) {
        String key = COMPLETION_PREFIX + userId + ":" + date + ":" + itemType;
        return get(key);
    }

    /**
     * 清除完成状态缓存
     */
    public void evictCompletion(Long userId, String date) {
        String prefix = COMPLETION_PREFIX + userId + ":" + date;
        deleteByPrefix(prefix);
    }

    // ==================== 打卡记录缓存 ====================

    /**
     * 缓存打卡记录
     */
    public void cacheCheckIn(Long userId, Object checkInData) {
        String key = CHECK_IN_PREFIX + userId;
        set(key, checkInData, DEFAULT_EXPIRE_HOURS, TimeUnit.HOURS);
    }

    /**
     * 获取打卡记录缓存
     */
    public Object getCheckIn(Long userId) {
        String key = CHECK_IN_PREFIX + userId;
        return get(key);
    }

    /**
     * 清除打卡记录缓存
     */
    public void evictCheckIn(Long userId) {
        String key = CHECK_IN_PREFIX + userId;
        delete(key);
    }

    // ==================== 统计方法 ====================

    /**
     * 获取缓存统计信息
     */
    public String getCacheStats() {
        try {
            long userCacheCount = countKeys(USER_PROFILE_PREFIX);
            long trainingCacheCount = countKeys(TRAINING_PLAN_PREFIX);
            long dietCacheCount = countKeys(DIET_PLAN_PREFIX);
            long completionCacheCount = countKeys(COMPLETION_PREFIX);
            long checkInCacheCount = countKeys(CHECK_IN_PREFIX);

            return String.format(
                "缓存统计 - 用户资料: %d, 训练计划: %d, 饮食计划: %d, 完成状态: %d, 打卡记录: %d",
                userCacheCount, trainingCacheCount, dietCacheCount, completionCacheCount, checkInCacheCount
            );
        } catch (Exception e) {
            return "缓存统计获取失败: " + e.getMessage();
        }
    }

    private long countKeys(String prefix) {
        Set<String> keys = redisTemplate.keys(prefix + "*");
        return keys != null ? keys.size() : 0;
    }
}

