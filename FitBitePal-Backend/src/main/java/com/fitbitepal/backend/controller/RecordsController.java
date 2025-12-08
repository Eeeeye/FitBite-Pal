package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.model.TrainingRecord;
import com.fitbitepal.backend.model.DietRecord;
import com.fitbitepal.backend.repository.TrainingRecordRepository;
import com.fitbitepal.backend.repository.DietRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 记录控制器 - 处理训练/饮食/体重记录
 */
@RestController
@RequestMapping("/records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecordsController {
    
    private final TrainingRecordRepository trainingRecordRepository;
    private final DietRecordRepository dietRecordRepository;
    
    // ==================== 训练记录 ====================
    
    /**
     * 创建训练记录
     */
    @PostMapping("/training/{userId}")
    public ResponseEntity<ApiResponse<TrainingRecord>> createTrainingRecord(
            @PathVariable Long userId,
            @RequestBody TrainingRecordRequest request) {
        
        TrainingRecord record = new TrainingRecord();
        record.setUserId(userId);
        record.setExerciseName(request.getExerciseName());
        record.setDuration(request.getDuration());
        record.setCaloriesBurned(request.getCaloriesBurned());
        record.setNotes(request.getNotes());
        
        TrainingRecord saved = trainingRecordRepository.save(record);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }
    
    /**
     * 获取训练记录列表
     */
    @GetMapping("/training/{userId}")
    public ResponseEntity<ApiResponse<List<TrainingRecord>>> getTrainingRecords(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<TrainingRecord> records;
        if (startDate != null && endDate != null) {
            LocalDateTime start = startDate.atStartOfDay();
            LocalDateTime end = endDate.atTime(LocalTime.MAX);
            records = trainingRecordRepository.findByUserIdAndCompletedAtBetween(userId, start, end);
        } else {
            records = trainingRecordRepository.findByUserIdOrderByCompletedAtDesc(userId);
        }
        
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    // ==================== 饮食记录 ====================
    
    /**
     * 创建饮食记录
     */
    @PostMapping("/diet/{userId}")
    public ResponseEntity<ApiResponse<DietRecord>> createDietRecord(
            @PathVariable Long userId,
            @RequestBody DietRecordRequest request) {
        
        DietRecord record = new DietRecord();
        record.setUserId(userId);
        record.setFoodName(request.getFoodName());
        record.setMealType(request.getMealType());
        record.setCalories(request.getCalories());
        record.setProtein(request.getProtein());
        record.setCarbs(request.getCarbs());
        record.setFat(request.getFat());
        record.setImageUrl(request.getImageUrl());
        record.setNotes(request.getNotes());
        
        DietRecord saved = dietRecordRepository.save(record);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }
    
    /**
     * 获取饮食记录列表
     */
    @GetMapping("/diet/{userId}")
    public ResponseEntity<ApiResponse<List<DietRecord>>> getDietRecords(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<DietRecord> records;
        if (startDate != null && endDate != null) {
            LocalDateTime start = startDate.atStartOfDay();
            LocalDateTime end = endDate.atTime(LocalTime.MAX);
            records = dietRecordRepository.findByUserIdAndRecordedAtBetween(userId, start, end);
        } else {
            records = dietRecordRepository.findByUserIdOrderByRecordedAtDesc(userId);
        }
        
        return ResponseEntity.ok(ApiResponse.success(records));
    }
    
    /**
     * 删除饮食记录
     */
    @DeleteMapping("/diet/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteDietRecord(@PathVariable Long recordId) {
        try {
            if (!dietRecordRepository.existsById(recordId)) {
                return ResponseEntity.ok(ApiResponse.error("Diet record not found"));
            }
            dietRecordRepository.deleteById(recordId);
            return ResponseEntity.ok(ApiResponse.success("Diet record deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("Failed to delete diet record: " + e.getMessage()));
        }
    }
    
    // ==================== 体重记录（已删除） ====================
    
    /**
     * 体重记录接口（已废弃）
     * @deprecated WeightRecord表已删除，体重统一存储在User表中
     *             使用 PUT /users/{userId}/profile 更新体重
     *             使用 GET /users/{userId} 获取最新体重
     */
    @Deprecated
    @PostMapping("/weight/{userId}")
    public ResponseEntity<ApiResponse<String>> createOrUpdateWeightRecord(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(
            "WeightRecord表已删除，请使用 PUT /users/" + userId + "/profile 更新体重"));
    }
    
    /**
     * 体重记录接口（已废弃）
     * @deprecated WeightRecord表已删除，使用 GET /users/{userId} 获取最新体重
     */
    @Deprecated
    @GetMapping("/weight/{userId}")
    public ResponseEntity<ApiResponse<String>> getWeightRecords(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(
            "WeightRecord表已删除，请使用 GET /users/" + userId + " 获取最新体重"));
    }
    
    // ==================== 统计数据 ====================
    
    /**
     * 获取统计数据（重构版 - 体重数据从User表获取）
     */
    @GetMapping("/statistics/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        
        // 计算消耗热量
        Integer caloriesBurned = trainingRecordRepository.sumCaloriesByUserIdAndDateRange(userId, start, end);
        
        // 计算摄入热量
        Integer caloriesIntake = dietRecordRepository.sumCaloriesByUserIdAndDateRange(userId, start, end);
        
        // ❌ 已删除：不再从WeightRecord获取体重数据
        // ✅ 体重数据统一从User表获取，前端通过 GET /users/{userId} 获取
        
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("caloriesBurned", caloriesBurned != null ? caloriesBurned : 0);
        statistics.put("caloriesIntake", caloriesIntake != null ? caloriesIntake : 0);
        statistics.put("message", "体重数据请通过 GET /users/" + userId + " 获取");
        
        return ResponseEntity.ok(ApiResponse.success(statistics));
    }
}







