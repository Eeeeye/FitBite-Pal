package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.dto.BasicInfoRequest;
import com.fitbitepal.backend.dto.UserProfileRequest;
import com.fitbitepal.backend.dto.UserProfileResponse;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/users")
@PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
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
            @Valid @RequestBody BasicInfoRequest request) {
        User updated = userService.updateBasicInfo(userId, request);
        return ResponseEntity.ok(ApiResponse.success("User info updated successfully", updated));
    }
}
