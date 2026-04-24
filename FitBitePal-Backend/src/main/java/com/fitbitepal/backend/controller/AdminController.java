package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.service.UserService;
import com.fitbitepal.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * 管理后台 API
 * 提供用户管理、食品库管理、系统配置等功能
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    private final CompletionRecordRepository completionRecordRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final FoodItemRepository foodItemRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final CalorieRecordRepository calorieRecordRepository;
    private final MealSetRepository mealSetRepository;
    private final UserService userService;  // ✅ 添加 UserService 用于缓存管理

    // ==================== 仪表盘统计 ====================

    /**
     * 获取仪表盘统计数据
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard() {
        Map<String, Object> stats = new HashMap<>();
        
        // 用户统计
        long totalUsers = userRepository.count();
        stats.put("totalUsers", totalUsers);
        stats.put("userCount", totalUsers); // 前端期望的字段名
        stats.put("activeUsers", totalUsers);
        
        // 今日统计
        LocalDate today = LocalDate.now();
        long todayCheckIns = checkInRecordRepository.countByCheckInDate(today);
        stats.put("todayCheckIns", todayCheckIns);
        
        // 训练计划统计
        long totalTrainingPlans = trainingPlanRepository.count();
        stats.put("totalTrainingPlans", totalTrainingPlans);
        
        // 饮食计划统计
        long totalDietPlans = dietPlanRepository.count();
        stats.put("totalDietPlans", totalDietPlans);
        
        // 食品库统计（只统计启用的）
        long totalFoodItems = foodItemRepository.countByEnabledTrue();
        stats.put("totalFoodItems", totalFoodItems);
        stats.put("foodCount", totalFoodItems); // 前端期望的字段名
        
        // 套餐统计（只统计启用的）
        long totalMealSets = mealSetRepository.countByEnabledTrue();
        stats.put("mealSetCount", totalMealSets); // 前端期望的字段名
        
        // 系统配置统计
        long totalConfigs = systemConfigRepository.count();
        stats.put("configCount", totalConfigs); // 前端期望的字段名
        
        // 完成记录统计
        long totalCompletions = completionRecordRepository.count();
        stats.put("totalCompletions", totalCompletions);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ==================== 用户管理 ====================

    /**
     * 获取用户列表（分页）
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> userPage = userRepository.findAll(pageRequest);
        
        Map<String, Object> result = new HashMap<>();
        result.put("users", userPage.getContent());
        result.put("totalPages", userPage.getTotalPages());
        result.put("totalElements", userPage.getTotalElements());
        result.put("currentPage", page);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 获取用户详情
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserDetail(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }
        
        User user = userOpt.get();
        Map<String, Object> detail = new HashMap<>();
        detail.put("user", user);
        
        // 获取用户的训练计划
        List<TrainingPlan> trainingPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, LocalDate.now());
        detail.put("todayTrainingPlan", trainingPlans);
        
        // 获取用户的饮食计划
        List<DietPlan> dietPlans = dietPlanRepository
                .findByUserIdAndPlanDateOrderByMealTimeAsc(userId, LocalDate.now());
        detail.put("todayDietPlan", dietPlans);
        
        // 获取打卡记录
        List<CheckInRecord> checkIns = checkInRecordRepository.findByUserIdOrderByCheckInDateDesc(userId);
        detail.put("checkInHistory", checkIns.size() > 10 ? checkIns.subList(0, 10) : checkIns);
        
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    /**
     * 获取用户统计源数据（供管理后台修正）
     */
    @GetMapping("/users/{userId}/stats-data")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserStatsData(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "30") int days) {

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(Math.max(days - 1, 0));

        Map<String, Object> result = new HashMap<>();
        result.put("user", userOpt.get());
        result.put("rangeStart", startDate);
        result.put("rangeEnd", endDate);
        result.put("checkIns", checkInRecordRepository
                .findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, startDate, endDate));
        result.put("exerciseCompletions", completionRecordRepository
                .findByUserIdAndItemTypeOrderByRecordDateDesc(userId, "exercise")
                .stream()
                .filter(record -> !record.getRecordDate().isBefore(startDate) && !record.getRecordDate().isAfter(endDate))
                .toList());
        result.put("mealCompletions", completionRecordRepository
                .findByUserIdAndItemTypeOrderByRecordDateDesc(userId, "meal")
                .stream()
                .filter(record -> !record.getRecordDate().isBefore(startDate) && !record.getRecordDate().isAfter(endDate))
                .toList());
        result.put("calorieRecords", calorieRecordRepository
                .findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate));

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/users/{userId}/check-ins")
    public ResponseEntity<ApiResponse<CheckInRecord>> saveUserCheckIn(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);
        LocalDate checkInDate = parseLocalDate(request.get("checkInDate"));

        CheckInRecord record = checkInRecordRepository.findByUserIdAndCheckInDate(userId, checkInDate)
                .orElseGet(CheckInRecord::new);

        record.setUserId(userId);
        record.setCheckInDate(checkInDate);
        record.setWeight(parseDoubleNullable(request.get("weight")));
        record.setHeight(parseDoubleNullable(request.get("height")));

        CheckInRecord saved = checkInRecordRepository.save(record);
        syncCurrentWeightForToday(user, checkInDate, saved.getWeight());
        userService.evictAllUserCaches(userId);

        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/check-ins/{recordId}")
    public ResponseEntity<ApiResponse<CheckInRecord>> updateUserCheckIn(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);
        CheckInRecord record = checkInRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Check-in record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Check-in record does not belong to this user");
        }

        LocalDate checkInDate = request.containsKey("checkInDate")
                ? parseLocalDate(request.get("checkInDate"))
                : record.getCheckInDate();

        checkInRecordRepository.findByUserIdAndCheckInDate(userId, checkInDate)
                .filter(existing -> !Objects.equals(existing.getId(), recordId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Check-in already exists for this date");
                });

        record.setCheckInDate(checkInDate);
        if (request.containsKey("weight")) {
            record.setWeight(parseDoubleNullable(request.get("weight")));
        }
        if (request.containsKey("height")) {
            record.setHeight(parseDoubleNullable(request.get("height")));
        }

        CheckInRecord saved = checkInRecordRepository.save(record);
        syncCurrentWeightForToday(user, checkInDate, saved.getWeight());
        userService.evictAllUserCaches(userId);

        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/check-ins/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCheckIn(
            @PathVariable Long userId,
            @PathVariable Long recordId) {

        CheckInRecord record = checkInRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Check-in record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Check-in record does not belong to this user");
        }

        checkInRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Check-in deleted successfully"));
    }

    @PostMapping("/users/{userId}/completions")
    public ResponseEntity<ApiResponse<CompletionRecord>> saveUserCompletion(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        LocalDate recordDate = parseLocalDate(request.get("recordDate"));
        String itemType = parseRequiredString(request.get("itemType"), "itemType");
        Integer itemIndex = parseIntegerRequired(request.get("itemIndex"), "itemIndex");

        CompletionRecord record = completionRecordRepository
                .findByUserIdAndRecordDateAndItemTypeAndItemIndex(userId, recordDate, itemType, itemIndex)
                .orElseGet(CompletionRecord::new);

        record.setUserId(userId);
        record.setRecordDate(recordDate);
        record.setItemType(itemType);
        record.setItemIndex(itemIndex);
        record.setCompleted(parseBooleanRequired(request.get("completed"), "completed"));
        record.setItemName(parseStringNullable(request.get("itemName")));
        record.setCalories(parseIntegerNullable(request.get("calories")));

        CompletionRecord saved = completionRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/completions/{recordId}")
    public ResponseEntity<ApiResponse<CompletionRecord>> updateUserCompletion(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        CompletionRecord record = completionRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Completion record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Completion record does not belong to this user");
        }

        LocalDate recordDate = request.containsKey("recordDate")
                ? parseLocalDate(request.get("recordDate"))
                : record.getRecordDate();
        String itemType = request.containsKey("itemType")
                ? parseRequiredString(request.get("itemType"), "itemType")
                : record.getItemType();
        Integer itemIndex = request.containsKey("itemIndex")
                ? parseIntegerRequired(request.get("itemIndex"), "itemIndex")
                : record.getItemIndex();

        completionRecordRepository.findByUserIdAndRecordDateAndItemTypeAndItemIndex(userId, recordDate, itemType, itemIndex)
                .filter(existing -> !Objects.equals(existing.getId(), recordId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Completion record already exists for this slot");
                });

        record.setRecordDate(recordDate);
        record.setItemType(itemType);
        record.setItemIndex(itemIndex);
        if (request.containsKey("completed")) {
            record.setCompleted(parseBooleanRequired(request.get("completed"), "completed"));
        }
        if (request.containsKey("itemName")) {
            record.setItemName(parseStringNullable(request.get("itemName")));
        }
        if (request.containsKey("calories")) {
            record.setCalories(parseIntegerNullable(request.get("calories")));
        }

        CompletionRecord saved = completionRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/completions/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCompletion(
            @PathVariable Long userId,
            @PathVariable Long recordId) {

        CompletionRecord record = completionRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Completion record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Completion record does not belong to this user");
        }

        completionRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Completion record deleted successfully"));
    }

    @PostMapping("/users/{userId}/calories")
    public ResponseEntity<ApiResponse<CalorieRecord>> saveUserCalories(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        LocalDate recordDate = parseLocalDate(request.get("recordDate"));

        CalorieRecord record = calorieRecordRepository.findByUserIdAndRecordDate(userId, recordDate)
                .orElseGet(CalorieRecord::new);

        record.setUserId(userId);
        record.setRecordDate(recordDate);
        record.setCalorieIntake(parseIntegerOrDefault(request.get("calorieIntake"), 0));
        record.setCalorieExpenditure(parseIntegerOrDefault(request.get("calorieExpenditure"), 0));
        record.setBaseMetabolism(parseIntegerNullable(request.get("baseMetabolism")));
        record.setExerciseCalories(parseIntegerNullable(request.get("exerciseCalories")));

        CalorieRecord saved = calorieRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/calories/{recordId}")
    public ResponseEntity<ApiResponse<CalorieRecord>> updateUserCalories(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        CalorieRecord record = calorieRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Calorie record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Calorie record does not belong to this user");
        }

        LocalDate recordDate = request.containsKey("recordDate")
                ? parseLocalDate(request.get("recordDate"))
                : record.getRecordDate();

        calorieRecordRepository.findByUserIdAndRecordDate(userId, recordDate)
                .filter(existing -> !Objects.equals(existing.getId(), recordId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Calorie record already exists for this date");
                });

        record.setRecordDate(recordDate);
        if (request.containsKey("calorieIntake")) {
            record.setCalorieIntake(parseIntegerOrDefault(request.get("calorieIntake"), 0));
        }
        if (request.containsKey("calorieExpenditure")) {
            record.setCalorieExpenditure(parseIntegerOrDefault(request.get("calorieExpenditure"), 0));
        }
        if (request.containsKey("baseMetabolism")) {
            record.setBaseMetabolism(parseIntegerNullable(request.get("baseMetabolism")));
        }
        if (request.containsKey("exerciseCalories")) {
            record.setExerciseCalories(parseIntegerNullable(request.get("exerciseCalories")));
        }

        CalorieRecord saved = calorieRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/calories/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCalories(
            @PathVariable Long userId,
            @PathVariable Long recordId) {

        CalorieRecord record = calorieRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Calorie record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Calorie record does not belong to this user");
        }

        calorieRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Calorie record deleted successfully"));
    }

    @PutMapping("/users/{userId}/metrics")
    public ResponseEntity<ApiResponse<User>> updateUserMetrics(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);

        if (request.containsKey("weight")) {
            user.setWeight(parseDoubleNullable(request.get("weight")));
        }
        if (request.containsKey("height")) {
            user.setHeight(parseDoubleNullable(request.get("height")));
        }
        if (request.containsKey("bodyFatRate")) {
            user.setBodyFatRate(parseDoubleNullable(request.get("bodyFatRate")));
        }
        if (request.containsKey("goalWeight")) {
            user.setGoalWeight(parseDoubleNullable(request.get("goalWeight")));
        }
        if (request.containsKey("goalBodyFatRate")) {
            user.setGoalBodyFatRate(parseDoubleNullable(request.get("goalBodyFatRate")));
        }
        if (request.containsKey("targetCalories")) {
            user.setTargetCalories(parseIntegerNullable(request.get("targetCalories")));
        }

        User saved = userRepository.save(user);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    /**
     * 更新用户角色
     */
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }
        
        User user = userOpt.get();
        String newRole = request.get("role");
        if (newRole == null || (!newRole.equals("USER") && !newRole.equals("ADMIN"))) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid role"));
        }
        
        user.setRole(newRole);
        userRepository.save(user);
        
        // ✅ 清除用户缓存
        userService.evictUserCache(userId);
        
        log.info("用户 {} 角色已更新为 {}", userId, newRole);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/users/{userId}")
    @Transactional
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable Long userId) {
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not found"));
        }
        
        // ✅ 先清除用户所有缓存
        userService.evictAllUserCaches(userId);
        
        // 删除所有关联数据
        trainingPlanRepository.deleteByUserId(userId);
        dietPlanRepository.deleteByUserId(userId);
        completionRecordRepository.deleteByUserId(userId);
        checkInRecordRepository.deleteByUserId(userId);
        calorieRecordRepository.deleteByUserId(userId);
        
        // 删除用户
        userRepository.deleteById(userId);
        
        log.info("用户 {} 及所有关联数据已删除", userId);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

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
        Page<FoodItem> foodPage = foodItemRepository.findByEnabledTrue(pageRequest);
        
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

    // ==================== 数据统计 ====================

    /**
     * 获取用户增长统计
     */
    @GetMapping("/stats/user-growth")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserGrowthStats(
            @RequestParam(defaultValue = "7") int days) {
        
        List<Map<String, Object>> stats = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Map<String, Object> dayStat = new HashMap<>();
            dayStat.put("date", date.toString());
            // 这里可以添加实际的统计逻辑
            dayStat.put("newUsers", 0);
            dayStat.put("activeUsers", 0);
            stats.add(dayStat);
        }
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * 获取训练完成统计
     */
    @GetMapping("/stats/training-completion")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrainingCompletionStats() {
        Map<String, Object> stats = new HashMap<>();
        
        LocalDate today = LocalDate.now();
        List<CompletionRecord> todayRecords = completionRecordRepository
                .findByRecordDateAndItemType(today, "exercise");
        
        long completed = todayRecords.stream().filter(CompletionRecord::getCompleted).count();
        long total = todayRecords.size();
        
        stats.put("date", today.toString());
        stats.put("completed", completed);
        stats.put("total", total);
        stats.put("completionRate", total > 0 ? (double) completed / total * 100 : 0);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private LocalDate parseLocalDate(Object value) {
        if (value == null) {
            throw new IllegalArgumentException("Date is required");
        }
        return LocalDate.parse(value.toString());
    }

    private Double parseDoubleNullable(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return Double.valueOf(value.toString());
    }

    private Integer parseIntegerNullable(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return Integer.valueOf(value.toString());
    }

    private Integer parseIntegerRequired(Object value, String fieldName) {
        Integer parsed = parseIntegerNullable(value);
        if (parsed == null) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return parsed;
    }

    private Integer parseIntegerOrDefault(Object value, int defaultValue) {
        Integer parsed = parseIntegerNullable(value);
        return parsed == null ? defaultValue : parsed;
    }

    private Boolean parseBooleanRequired(Object value, String fieldName) {
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return Boolean.valueOf(value.toString());
    }

    private String parseRequiredString(Object value, String fieldName) {
        String parsed = parseStringNullable(value);
        if (parsed == null || parsed.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return parsed;
    }

    private String parseStringNullable(Object value) {
        return value == null ? null : value.toString().trim();
    }

    private void syncCurrentWeightForToday(User user, LocalDate date, Double weight) {
        if (weight != null && LocalDate.now().equals(date)) {
            user.setWeight(weight);
            userRepository.save(user);
        }
    }
}
