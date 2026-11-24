package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.dto.CalorieRecordRequest;
import com.fitbitepal.backend.service.ProgressReportService;
import com.fitbitepal.backend.service.ProgressReportService.WeightDay;
import com.fitbitepal.backend.service.ProgressReportService.LiveCalorieDay;
import com.fitbitepal.backend.service.ActivityRecordService;
import jakarta.validation.Valid;
import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/data")
@RequiredArgsConstructor
public class DataController {
    
    private final ActivityRecordService writer;
    private final CalorieRecordRepository calorieRecordRepository;
    private final ProgressReportService reports;
    private final UserRepository userRepository;
    
    /**
     * 获取体重历史记录
     * 从打卡记录中获取每次打卡时保存的体重数据，用于折线图展示
     * 今天的数据始终与 User 表同步（实时数据）
     */
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/weight")
    public ResponseEntity<ApiResponse<List<WeightDay>>> getWeightRecords(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        return ResponseEntity.ok(ApiResponse.success(reports.weightHistory(userId, days)));
    }
    
    /**
     * 添加体重记录（重构版 - 已废弃）
     * @deprecated 体重统一通过 saveUserProfile 更新到 User 表
     */
    @Deprecated
    @PostMapping("/weight")
    public ResponseEntity<ApiResponse<String>> addWeightRecord(
            @RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(ApiResponse.success("请使用 /users/{userId}/profile 接口更新体重"));
    }
    
    /**
     * 获取卡路里记录（支持 query 参数）
     * 返回数据包含: date, intake, expenditure, baseMetabolism, exerciseCalories
     */
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/calories")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCalorieRecords(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        // 获取用户BMR
        User user = userRepository.findById(userId).orElse(null);
        Integer userBmr = (user != null && user.getBmr() != null) ? user.getBmr() : 1500;
        
        List<CalorieRecord> calorieRecords = reports.snapshotHistory(userId, days);
        
        List<Map<String, Object>> records = new ArrayList<>();
        for (CalorieRecord cr : calorieRecords) {
            Map<String, Object> record = new HashMap<>();
            record.put("date", cr.getRecordDate().toString());
            record.put("intake", cr.getCalorieIntake());
            record.put("expenditure", cr.getCalorieExpenditure());
            // ✅ 新增字段：基础代谢率和运动消耗
            record.put("baseMetabolism", cr.getBaseMetabolism() != null ? cr.getBaseMetabolism() : userBmr);
            record.put("exerciseCalories", cr.getExerciseCalories() != null ? cr.getExerciseCalories() : 0);
            records.add(record);
        }
        
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/calories/live")
    public ApiResponse<List<LiveCalorieDay>> liveCalories(@RequestParam Long userId,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal User actor) {
        return ApiResponse.success(reports.liveCalories(userId, days, endDate, actor));
    }

    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/progress")
    public ApiResponse<ProgressReportService.Report> progress(@RequestParam Long userId,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal User actor) {
        return ApiResponse.success(reports.progress(userId, days, endDate, actor));
    }

    /**
     * 添加卡路里记录
     */
    @PreAuthorize("hasRole('ADMIN') or #request.userId == principal.id")
    @PostMapping("/calories")
    public ResponseEntity<ApiResponse<CalorieRecord>> addCalorieRecord(
            @Valid @RequestBody CalorieRecordRequest request) {
        CalorieRecord saved = writer.createCalories(request);
        return ResponseEntity.ok(ApiResponse.success("Calorie recorded successfully", saved));
    }
    
    /**
     * 获取统计数据汇总
     */
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        return ResponseEntity.ok(ApiResponse.success(reports.statistics(userId, days)));
    }
    
    /**
     * 旧的体重记录接口（已废弃）
     * @deprecated WeightRecord表已删除，使用 GET /data/weight 代替
     */
    @Deprecated
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/weight/{userId}")
    public ResponseEntity<ApiResponse<String>> getWeightRecordsLegacy(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("WeightRecord表已删除，请使用 GET /data/weight?userId=" + userId));
    }
    
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/calories/{userId}")
    public ResponseEntity<ApiResponse<List<CalorieRecord>>> getCalorieRecordsLegacy(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<CalorieRecord> records;
        if (startDate != null && endDate != null) {
            records = calorieRecordRepository.findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                    userId, startDate, endDate);
        } else {
            records = calorieRecordRepository.findTop7ByUserIdOrderByRecordDateDesc(userId);
        }
        return ResponseEntity.ok(ApiResponse.success(records));
    }

}
