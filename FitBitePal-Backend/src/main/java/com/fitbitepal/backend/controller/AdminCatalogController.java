package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminCatalogController {
    private final FoodItemRepository foodItemRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final MealSetRepository mealSetRepository;

    // ==================== 食品库管理 ====================

    /**
     * 获取食品列表（分页）
     */
    @GetMapping("/foods")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFoods(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<FoodItem> foodPage = foodItemRepository.filterEnabled(
                category == null || category.isBlank() ? null : category.trim(),
                search == null ? "" : search.trim(), pageRequest);

        Map<String, Object> result = new HashMap<>();
        result.put("foods", foodPage.getContent());
        result.put("totalPages", foodPage.getTotalPages());
        result.put("totalElements", foodPage.getTotalElements());
        result.put("currentPage", page);

        // 获取所有分类
        result.put("categories", foodItemRepository.findAllCategories());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 添加食品
     */
    @PostMapping("/foods")
    public ResponseEntity<ApiResponse<FoodItem>> addFood(@RequestBody FoodItem foodItem) {
        foodItem.setEnabled(true);
        FoodItem saved = foodItemRepository.save(foodItem);
        log.info("添加食品: {}", saved.getName());
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 更新食品
     */
    @PutMapping("/foods/{foodId}")
    public ResponseEntity<ApiResponse<FoodItem>> updateFood(
            @PathVariable Long foodId,
            @RequestBody FoodItem foodItem) {

        Optional<FoodItem> existingOpt = foodItemRepository.findById(foodId);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Food not found"));
        }

        FoodItem existing = existingOpt.get();
        // 保留原有的 enabled 状态，除非前端明确传了
        if (foodItem.getEnabled() == null) {
            foodItem.setEnabled(existing.getEnabled());
        }
        foodItem.setId(foodId);
        FoodItem saved = foodItemRepository.save(foodItem);
        log.info("更新食品: {}", saved.getName());
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 删除食品（软删除）
     */
    @DeleteMapping("/foods/{foodId}")
    public ResponseEntity<ApiResponse<String>> deleteFood(@PathVariable Long foodId) {
        Optional<FoodItem> foodOpt = foodItemRepository.findById(foodId);
        if (foodOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Food not found"));
        }

        FoodItem food = foodOpt.get();
        food.setEnabled(false);
        foodItemRepository.save(food);

        log.info("禁用食品: {}", food.getName());
        return ResponseEntity.ok(ApiResponse.success("Food disabled successfully"));
    }

    /**
     * 批量导入食品
     */
    @PostMapping("/foods/import")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importFoods(@RequestBody List<FoodItem> foods) {
        int imported = 0;
        int failed = 0;

        for (FoodItem food : foods) {
            try {
                food.setEnabled(true);
                foodItemRepository.save(food);
                imported++;
            } catch (Exception e) {
                failed++;
                log.error("导入食品失败: {}", food.getName(), e);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("imported", imported);
        result.put("failed", failed);
        result.put("total", foods.size());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ==================== 系统配置管理 ====================

    /**
     * 获取所有系统配置
     */
    @GetMapping("/configs")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfigs(
            @RequestParam(required = false) String category) {

        List<SystemConfig> configs;
        if (category != null && !category.isEmpty()) {
            configs = systemConfigRepository.findByCategory(category);
        } else {
            configs = systemConfigRepository.findAll();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("configs", configs);
        result.put("total", configs.size());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 获取单个配置
     */
    @GetMapping("/configs/{key}")
    public ResponseEntity<ApiResponse<SystemConfig>> getConfig(@PathVariable String key) {
        Optional<SystemConfig> configOpt = systemConfigRepository.findByConfigKey(key);
        if (configOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Config not found"));
        }
        return ResponseEntity.ok(ApiResponse.success(configOpt.get()));
    }

    /**
     * 添加/更新配置
     */
    @PostMapping("/configs")
    public ResponseEntity<ApiResponse<SystemConfig>> saveConfig(@RequestBody SystemConfig config) {
        Optional<SystemConfig> existingOpt = systemConfigRepository.findByConfigKey(config.getConfigKey());

        if (existingOpt.isPresent()) {
            SystemConfig existing = existingOpt.get();
            existing.setConfigValue(config.getConfigValue());
            existing.setDescription(config.getDescription());
            existing.setConfigType(config.getConfigType());
            existing.setCategory(config.getCategory());
            SystemConfig saved = systemConfigRepository.save(existing);
            return ResponseEntity.ok(ApiResponse.success(saved));
        } else {
            SystemConfig saved = systemConfigRepository.save(config);
            return ResponseEntity.ok(ApiResponse.success(saved));
        }
    }

    /**
     * 更新配置（通过ID）
     */
    @PutMapping("/configs/{configId}")
    public ResponseEntity<ApiResponse<SystemConfig>> updateConfig(
            @PathVariable Long configId,
            @RequestBody SystemConfig config) {

        Optional<SystemConfig> existingOpt = systemConfigRepository.findById(configId);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Config not found"));
        }

        SystemConfig existing = existingOpt.get();
        existing.setConfigKey(config.getConfigKey());
        existing.setConfigValue(config.getConfigValue());
        existing.setDescription(config.getDescription());
        existing.setConfigType(config.getConfigType());
        existing.setCategory(config.getCategory());
        SystemConfig saved = systemConfigRepository.save(existing);

        log.info("更新配置: {}", saved.getConfigKey());
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 删除配置（支持通过 ID 或 configKey 删除）
     */
    @DeleteMapping("/configs/{idOrKey}")
    public ResponseEntity<ApiResponse<String>> deleteConfig(@PathVariable String idOrKey) {
        Optional<SystemConfig> configOpt;

        // 尝试按 ID 删除（如果是数字）
        try {
            Long id = Long.parseLong(idOrKey);
            configOpt = systemConfigRepository.findById(id);
        } catch (NumberFormatException e) {
            // 如果不是数字，按 configKey 删除
            configOpt = systemConfigRepository.findByConfigKey(idOrKey);
        }

        if (configOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Config not found"));
        }

        systemConfigRepository.delete(configOpt.get());
        log.info("删除配置: {}", idOrKey);
        return ResponseEntity.ok(ApiResponse.success("Config deleted successfully"));
    }

    /**
     * 初始化默认配置
     */
    @PostMapping("/configs/init-defaults")
    public ResponseEntity<ApiResponse<String>> initDefaultConfigs() {
        // 系统基础配置
        saveDefaultConfig("app.name", "FitBitePal", "STRING", "SYSTEM", "应用名称");
        saveDefaultConfig("app.version", "1.0.0", "STRING", "SYSTEM", "应用版本号");
        saveDefaultConfig("app.maintenance.mode", "false", "BOOLEAN", "SYSTEM", "维护模式开关");

        // 缓存配置
        saveDefaultConfig("cache.user.ttl.hours", "24", "INTEGER", "SYSTEM", "用户缓存过期时间(小时)");
        saveDefaultConfig("cache.plan.ttl.hours", "12", "INTEGER", "SYSTEM", "计划缓存过期时间(小时)");

        // 通知配置
        saveDefaultConfig("notification.daily.reminder", "true", "BOOLEAN", "NOTIFICATION", "每日打卡提醒");
        saveDefaultConfig("notification.reminder.time", "08:00", "STRING", "NOTIFICATION", "提醒时间");

        // 显示配置
        saveDefaultConfig("display.default.language", "zh", "STRING", "DISPLAY", "默认语言(zh/en)");
        saveDefaultConfig("display.theme", "dark", "STRING", "DISPLAY", "默认主题(dark/light)");

        return ResponseEntity.ok(ApiResponse.success("Default configs initialized"));
    }

    private void saveDefaultConfig(String key, String value, String type, String category, String desc) {
        if (!systemConfigRepository.existsByConfigKey(key)) {
            SystemConfig config = new SystemConfig();
            config.setConfigKey(key);
            config.setConfigValue(value);
            config.setConfigType(type);
            config.setCategory(category);
            config.setDescription(desc);
            systemConfigRepository.save(config);
        }
    }

    // ==================== 套餐管理 ====================

    /**
     * 获取套餐列表
     */
    @GetMapping("/meal-sets")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMealSets(
            @RequestParam(required = false) String goalType,
            @RequestParam(required = false) String mealType) {

        List<MealSet> mealSets;
        if (goalType != null && mealType != null) {
            mealSets = mealSetRepository.findByGoalTypeAndMealTypeAndEnabledTrue(goalType, mealType);
        } else if (goalType != null) {
            mealSets = mealSetRepository.findByGoalTypeAndEnabledTrue(goalType);
        } else if (mealType != null) {
            mealSets = mealSetRepository.findByMealTypeAndEnabledTrue(mealType);
        } else {
            mealSets = mealSetRepository.findByEnabledTrue();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("mealSets", mealSets);
        result.put("total", mealSets.size());

        // 统计各类型数量
        result.put("loseWeightCount", mealSetRepository.countByGoalTypeAndEnabledTrue("Lose weight"));
        result.put("buildMuscleCount", mealSetRepository.countByGoalTypeAndEnabledTrue("Build muscle"));
        result.put("keepFitCount", mealSetRepository.countByGoalTypeAndEnabledTrue("Keep fit"));

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 添加套餐
     */
    @PostMapping("/meal-sets")
    public ResponseEntity<ApiResponse<MealSet>> addMealSet(@RequestBody MealSet mealSet) {
        mealSet.setEnabled(true);
        MealSet saved = mealSetRepository.save(mealSet);
        log.info("添加套餐: {} ({}:{})", saved.getName(), saved.getGoalType(), saved.getMealType());
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 更新套餐
     */
    @PutMapping("/meal-sets/{mealSetId}")
    public ResponseEntity<ApiResponse<MealSet>> updateMealSet(
            @PathVariable Long mealSetId,
            @RequestBody MealSet mealSet) {

        Optional<MealSet> existingOpt = mealSetRepository.findById(mealSetId);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("MealSet not found"));
        }

        MealSet existing = existingOpt.get();
        // 保留原有的 enabled 状态，除非前端明确传了
        if (mealSet.getEnabled() == null) {
            mealSet.setEnabled(existing.getEnabled());
        }
        mealSet.setId(mealSetId);
        MealSet saved = mealSetRepository.save(mealSet);
        log.info("更新套餐: {}", saved.getName());
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 删除套餐（软删除）
     */
    @DeleteMapping("/meal-sets/{mealSetId}")
    public ResponseEntity<ApiResponse<String>> deleteMealSet(@PathVariable Long mealSetId) {
        Optional<MealSet> mealSetOpt = mealSetRepository.findById(mealSetId);
        if (mealSetOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("MealSet not found"));
        }

        MealSet mealSet = mealSetOpt.get();
        mealSet.setEnabled(false);
        mealSetRepository.save(mealSet);

        log.info("禁用套餐: {}", mealSet.getName());
        return ResponseEntity.ok(ApiResponse.success("MealSet disabled successfully"));
    }
}
