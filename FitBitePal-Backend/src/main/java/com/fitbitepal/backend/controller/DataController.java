package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/data")
@RequiredArgsConstructor
public class DataController {
    
    private final CalorieRecordRepository calorieRecordRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final UserRepository userRepository;
    
    /**
     * 获取体重历史记录
     * 从打卡记录中获取每次打卡时保存的体重数据，用于折线图展示
     * 今天的数据始终与 User 表同步（实时数据）
     */
    @GetMapping("/weight")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getWeightRecords(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        List<Map<String, Object>> records = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        // ✅ 从User表获取当前最新体重（作为今天的实时数据）
        User user = userRepository.findById(userId).orElse(null);
        Double currentWeight = 0.0;
        if (user != null && user.getWeight() != null) {
            currentWeight = user.getWeight();
        }
        
        // ✅ 从CheckInRecord获取打卡历史（包含体重数据）
        LocalDate endDate = today;
        LocalDate startDate = endDate.minusDays(days - 1);
        List<CheckInRecord> checkIns = checkInRecordRepository.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(
                userId, startDate, endDate);
        
        // ✅ 返回体重数据
        for (CheckInRecord checkIn : checkIns) {
            Map<String, Object> record = new HashMap<>();
            record.put("date", checkIn.getCheckInDate().toString());
            
            // ✅ 关键：今天的数据始终使用 User 表的实时体重
            // 历史数据使用打卡记录中保存的体重
            Double weight;
            if (checkIn.getCheckInDate().equals(today)) {
                // 今天的数据：使用 User 表的当前体重（实时同步）
                weight = currentWeight;
            } else {
                // 历史数据：使用打卡记录中的体重，如果没有则用当前体重
                weight = checkIn.getWeight() != null ? checkIn.getWeight() : currentWeight;
            }
            record.put("weight", weight);
            records.add(record);
        }
        
        return ResponseEntity.ok(ApiResponse.success(records));
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
    @GetMapping("/calories")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCalorieRecords(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // 获取用户BMR
        User user = userRepository.findById(userId).orElse(null);
        Integer userBmr = (user != null && user.getBmr() != null) ? user.getBmr() : 1500;
        
        List<CalorieRecord> calorieRecords = calorieRecordRepository.findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                userId, startDate, endDate);
        
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
    
    /**
     * 添加卡路里记录
     */
    @PostMapping("/calories")
    public ResponseEntity<ApiResponse<CalorieRecord>> addCalorieRecord(
            @RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        
        CalorieRecord record = new CalorieRecord();
        record.setUserId(userId);
        record.setCalorieIntake(payload.containsKey("intake") ? 
                Integer.valueOf(payload.get("intake").toString()) : 0);
        record.setCalorieExpenditure(payload.containsKey("expenditure") ? 
                Integer.valueOf(payload.get("expenditure").toString()) : 0);
        record.setRecordDate(LocalDate.now());
        
        CalorieRecord saved = calorieRecordRepository.save(record);
        return ResponseEntity.ok(ApiResponse.success("Calorie recorded successfully", saved));
    }
    
    /**
     * 获取统计数据汇总
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // 获取体重数据
        List<CheckInRecord> checkIns = checkInRecordRepository.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(
                userId, startDate, endDate);
        
        // 获取卡路里数据
        List<CalorieRecord> calorieRecords = calorieRecordRepository.findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                userId, startDate, endDate);
        
        Map<String, Object> statistics = new HashMap<>();
        
        // ✅ 修复：优先从 User 表获取当前体重，确保数据统一
        // ✅ 统一数据源：只从 User 表获取体重（重构后的逻辑）
        User user = userRepository.findById(userId).orElse(null);
        Double currentWeight = 0.0;
            
        if (user != null && user.getWeight() != null) {
            currentWeight = user.getWeight();
        }
        
        statistics.put("currentWeight", currentWeight);
        
        // 体重变化：由于已删除 WeightRecord 表，无法计算历史变化
        // 如果需要历史追踪，建议在前端缓存或使用单独的体重历史表
            statistics.put("weightChange", 0.0);
        
        // 计算体脂率（模拟数据）
        statistics.put("bodyFat", 20.5);
        statistics.put("bodyFatChange", -0.8);
        
        // 计算平均卡路里消耗
        if (!calorieRecords.isEmpty()) {
            double totalExpenditure = calorieRecords.stream()
                    .mapToDouble(CalorieRecord::getCalorieExpenditure)
                    .sum();
            statistics.put("avgCalorieBurn", (int) (totalExpenditure / calorieRecords.size()));
        } else {
            statistics.put("avgCalorieBurn", 0);
        }
        
        // 营养分数（模拟数据）
        statistics.put("nutritionScore", 85);
        statistics.put("nutritionScoreChange", 5);
        
        // 目标体重（从最新的 CheckInRecord 获取，或使用默认值）
        statistics.put("goalWeight", 70.0);
        
        return ResponseEntity.ok(ApiResponse.success(statistics));
    }
    
    /**
     * 旧的体重记录接口（已废弃）
     * @deprecated WeightRecord表已删除，使用 GET /data/weight 代替
     */
    @Deprecated
    @GetMapping("/weight/{userId}")
    public ResponseEntity<ApiResponse<String>> getWeightRecordsLegacy(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("WeightRecord表已删除，请使用 GET /data/weight?userId=" + userId));
    }
    
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

