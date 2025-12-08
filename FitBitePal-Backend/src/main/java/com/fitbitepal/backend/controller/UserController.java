package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.dto.UserProfileRequest;
import com.fitbitepal.backend.dto.UserProfileResponse;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    /**
     * 保存用户画像
     */
    @PostMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> saveProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UserProfileRequest request) {
        UserProfileResponse response = userService.saveUserProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Profile saved and plans generated successfully", response));
    }
    
    /**
     * 获取用户信息
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserInfo(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    /**
     * 获取用户画像（重构版 - 返回User对象）
     * UserProfile表已删除，现在直接返回User对象，所有数据统一在User表中
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<User>> getUserProfile(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    /**
     * 获取训练计划
     * @param userId 用户ID
     * @param date 可选的日期参数（格式：YYYY-MM-DD），如果不提供则返回今天的计划
     */
    @GetMapping("/{userId}/training-plan")
    public ResponseEntity<ApiResponse<List<TrainingPlan>>> getTrainingPlan(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        // 如果没有提供日期，使用今天
        LocalDate targetDate = date != null ? date : LocalDate.now();
        
        List<TrainingPlan> plans = userService.getTrainingPlanByDate(userId, targetDate);
        return ResponseEntity.ok(ApiResponse.success(plans));
    }
    
    /**
     * 获取饮食计划
     */
    @GetMapping("/{userId}/diet-plan")
    public ResponseEntity<ApiResponse<List<DietPlan>>> getDietPlan(@PathVariable Long userId) {
        List<DietPlan> plans = userService.getDietPlan(userId);
        return ResponseEntity.ok(ApiResponse.success(plans));
    }
    
    /**
     * 更新用户基本信息（用户名、电话号码）
     */
    @PutMapping("/{userId}/basic-info")
    public ResponseEntity<ApiResponse<User>> updateBasicInfo(
            @PathVariable Long userId,
            @RequestBody java.util.Map<String, String> updates) {
        User user = userService.getUserById(userId);
        
        if (updates.containsKey("username")) {
            user.setUsername(updates.get("username"));
        }
        if (updates.containsKey("phone")) {
            user.setPhone(updates.get("phone"));
        }
        
        User updated = userService.updateUser(user);
        return ResponseEntity.ok(ApiResponse.success("User info updated successfully", updated));
    }
    
    /**
     * 保存打卡记录
     */
    @PostMapping("/{userId}/check-in")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> saveCheckIn(
            @PathVariable Long userId,
            @RequestBody java.util.Map<String, Object> checkInData) {
        java.util.Map<String, Object> result = userService.saveCheckIn(userId, checkInData);
        return ResponseEntity.ok(ApiResponse.success("Check-in saved successfully", result));
    }
    
    /**
     * 获取打卡状态
     */
    @GetMapping("/{userId}/check-in/status")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getCheckInStatus(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        java.util.Map<String, Object> status = userService.getCheckInStatus(userId, date);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
    
    /**
     * 获取所有打卡历史记录
     * 返回用户的所有打卡日期列表，用于前端显示打卡日历
     */
    @GetMapping("/{userId}/check-in/history")
    public ResponseEntity<ApiResponse<java.util.List<String>>> getCheckInHistory(
            @PathVariable Long userId,
            @RequestParam(required = false) Integer days) {
        java.util.List<String> history = userService.getCheckInHistory(userId, days);
        return ResponseEntity.ok(ApiResponse.success(history));
    }
    
    /**
     * 调整今日训练计划
     * 根据用户调整的参数重新生成今天的训练计划
     * 前提：今天没有任何已完成的训练
     */
    @PostMapping("/{userId}/adjust-today-plan")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> adjustTodayPlan(
            @PathVariable Long userId,
            @RequestBody java.util.Map<String, Object> adjustData) {
        java.util.Map<String, Object> result = userService.adjustTodayPlan(userId, adjustData);
        
        if (result.containsKey("hasCompletedExercises") && (Boolean) result.get("hasCompletedExercises")) {
            return ResponseEntity.ok(ApiResponse.error("今天有已完成的训练，请先取消所有已勾选的运动"));
        }
        
        return ResponseEntity.ok(ApiResponse.success("训练计划已重新生成", result));
    }
    
    /**
     * 检查今天是否有已完成的训练
     */
    @GetMapping("/{userId}/today-completion-status")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTodayCompletionStatus(
            @PathVariable Long userId) {
        java.util.Map<String, Object> status = userService.getTodayCompletionStatus(userId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}

