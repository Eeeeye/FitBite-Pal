package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminStatisticsController {
    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    private final CompletionRecordRepository completionRecordRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final FoodItemRepository foodItemRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final MealSetRepository mealSetRepository;

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


        // 今日统计
        LocalDate today = LocalDate.now();
        long todayCheckIns = checkInRecordRepository.countByCheckInDate(today);
        stats.put("todayCheckIns", todayCheckIns);
        stats.put("activeUsers", todayCheckIns);

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

    // ==================== 数据统计 ====================

    /**
     * 获取用户增长统计
     */
    @GetMapping("/stats/user-growth")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserGrowthStats(
            @RequestParam(defaultValue = "7") int days) {

        if (days < 1 || days > 366) throw new IllegalArgumentException("days must be between 1 and 366");
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(days - 1L);
        Map<LocalDate, Long> registrations = new HashMap<>();
        userRepository.registrationsByDate(start.atStartOfDay(), today.plusDays(1).atStartOfDay())
                .forEach(row -> registrations.put(row.date(), row.count()));
        Map<LocalDate, Long> active = new HashMap<>();
        checkInRecordRepository.dailyActiveUsers(start, today).forEach(row -> active.put(row.date(), row.count()));
        List<Map<String, Object>> stats = new ArrayList<>(days);
        start.datesUntil(today.plusDays(1)).forEach(day -> stats.add(Map.of("date", day,
                "newUsers", registrations.getOrDefault(day, 0L), "activeUsers", active.getOrDefault(day, 0L))));
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * 获取训练完成统计
     */
    @GetMapping("/stats/training-completion")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrainingCompletionStats() {
        Map<String, Object> stats = new HashMap<>();

        LocalDate today = LocalDate.now();
        var totals = completionRecordRepository.completionTotals(today, "exercise");
        long total = totals.getTotal();
        long completed = totals.getCompleted();

        stats.put("date", today.toString());
        stats.put("completed", completed);
        stats.put("total", total);
        stats.put("completionRate", total > 0 ? (double) completed / total * 100 : 0);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
