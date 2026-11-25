package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.service.UserService;
import com.fitbitepal.backend.service.AccountDeletionService;
import com.fitbitepal.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {
    private final AccountDeletionService accounts;
    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    private final CompletionRecordRepository completionRecordRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final CalorieRecordRepository calorieRecordRepository;
    private final UserService userService;

    @GetMapping({"", "/"})
    public ResponseEntity<Void> console(HttpServletRequest request) {
        URI page = URI.create(request.getContextPath() + "/admin/index.html");
        return ResponseEntity.status(302).location(page).build();
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
        String term = search == null ? "" : search.trim();
        Page<User> userPage = term.isEmpty() ? userRepository.findAll(pageRequest)
                : userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(term, term, pageRequest);
        
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
        detail.put("todayDietPlan", dietPlans.stream().filter(plan -> !plan.isHidden()).toList());
        
        // 获取打卡记录
        List<CheckInRecord> checkIns = checkInRecordRepository.findTop10ByUserIdOrderByCheckInDateDesc(userId);
        detail.put("checkInHistory", checkIns);
        
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
                .findByUserIdAndItemTypeAndRecordDateBetweenOrderByRecordDateDesc(userId, "exercise", startDate, endDate));
        result.put("mealCompletions", completionRecordRepository
                .findByUserIdAndItemTypeAndRecordDateBetweenOrderByRecordDateDesc(userId, "meal", startDate, endDate));
        result.put("calorieRecords", calorieRecordRepository
                .findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, startDate, endDate));

        return ResponseEntity.ok(ApiResponse.success(result));
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
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable Long userId) {
        accounts.deleteByAdmin(userId);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }
}
