package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
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
    private final CompletionRecordRepository completionRecordRepository;
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
        
        // ✅ 返回体重数据。今天即使尚未打卡，也使用 User 表当前体重补一个实时点，
        // 避免新的一天进入图表范围后当天点位缺失。
        Map<LocalDate, Map<String, Object>> recordsByDate = new LinkedHashMap<>();
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
            recordsByDate.put(checkIn.getCheckInDate(), record);
        }

        if (!recordsByDate.containsKey(today) && currentWeight != null && currentWeight > 0) {
            Map<String, Object> todayRecord = new HashMap<>();
            todayRecord.put("date", today.toString());
            todayRecord.put("weight", currentWeight);
            recordsByDate.put(today, todayRecord);
        }
        
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(recordsByDate.values())));
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
        
        List<CheckInRecord> checkIns = checkInRecordRepository.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(
                userId, startDate, endDate);
        List<CalorieRecord> calorieRecords = calorieRecordRepository.findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
                userId, startDate, endDate);
        List<CompletionRecord> mealRecords = completionRecordRepository.findByUserIdAndItemTypeOrderByRecordDateDesc(userId, "meal")
                .stream()
                .filter(record -> !record.getRecordDate().isBefore(startDate) && !record.getRecordDate().isAfter(endDate))
                .toList();
        
        Map<String, Object> statistics = new HashMap<>();
        
        User user = userRepository.findById(userId).orElse(null);
        Double currentWeight = 0.0;
            
        if (user != null && user.getWeight() != null) {
            currentWeight = user.getWeight();
        }
        
        statistics.put("currentWeight", currentWeight);

        Double baselineWeight = checkIns.stream()
                .map(CheckInRecord::getWeight)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(currentWeight);
        statistics.put("weightChange", roundDouble(currentWeight - baselineWeight));

        Double bodyFat = user != null && user.getBodyFatRate() != null ? user.getBodyFatRate() : 0.0;
        statistics.put("bodyFat", bodyFat);
        statistics.put("bodyFatChange", calculateBodyFatChange(checkIns, currentWeight, bodyFat));
        
        if (!calorieRecords.isEmpty()) {
            double totalExpenditure = calorieRecords.stream()
                    .mapToDouble(CalorieRecord::getCalorieExpenditure)
                    .sum();
            statistics.put("avgCalorieBurn", (int) (totalExpenditure / calorieRecords.size()));
        } else {
            statistics.put("avgCalorieBurn", 0);
        }

        int nutritionScore = calculateNutritionScore(user, calorieRecords, mealRecords);
        statistics.put("nutritionScore", nutritionScore);
        statistics.put("nutritionScoreChange", calculateNutritionScoreChange(user, calorieRecords, mealRecords, startDate, endDate));

        statistics.put("goalWeight", resolveGoalWeight(user, currentWeight));
        statistics.put("goalBodyFat", resolveGoalBodyFat(user, bodyFat));
        
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

    private int calculateNutritionScore(User user, List<CalorieRecord> calorieRecords, List<CompletionRecord> mealRecords) {
        List<Double> scoreParts = new ArrayList<>();

        if (user != null && user.getTargetCalories() != null && user.getTargetCalories() > 0 && !calorieRecords.isEmpty()) {
            double avgIntake = calorieRecords.stream()
                    .mapToInt(record -> record.getCalorieIntake() == null ? 0 : record.getCalorieIntake())
                    .average()
                    .orElse(0);
            double target = user.getTargetCalories();
            double diffRatio = Math.min(1.0, Math.abs(avgIntake - target) / target);
            scoreParts.add(100 - diffRatio * 100);
        }

        if (!mealRecords.isEmpty()) {
            long completedMeals = mealRecords.stream().filter(record -> Boolean.TRUE.equals(record.getCompleted())).count();
            scoreParts.add((completedMeals * 100.0) / mealRecords.size());
        }

        if (scoreParts.isEmpty()) {
            return 0;
        }

        double avgScore = scoreParts.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        return (int) Math.round(Math.max(0, Math.min(100, avgScore)));
    }

    private double calculateBodyFatChange(List<CheckInRecord> checkIns, Double currentWeight, Double currentBodyFat) {
        if (currentBodyFat == null || currentBodyFat <= 0 || currentWeight == null || currentWeight <= 0) {
            return 0.0;
        }

        Double baselineWeight = checkIns.stream()
                .map(CheckInRecord::getWeight)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(currentWeight);

        if (baselineWeight == null || Objects.equals(baselineWeight, currentWeight)) {
            return 0.0;
        }

        double weightChangeRatio = (currentWeight - baselineWeight) / currentWeight;
        double estimatedBodyFatChange = weightChangeRatio * 35.0;
        double clamped = Math.max(-5.0, Math.min(5.0, estimatedBodyFatChange));
        return roundDouble(clamped);
    }

    private int calculateNutritionScoreChange(
            User user,
            List<CalorieRecord> calorieRecords,
            List<CompletionRecord> mealRecords,
            LocalDate startDate,
            LocalDate endDate) {

        List<LocalDate> dates = new ArrayList<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            dates.add(cursor);
            cursor = cursor.plusDays(1);
        }

        if (dates.size() < 2) {
            return 0;
        }

        Map<LocalDate, CalorieRecord> calorieMap = new HashMap<>();
        for (CalorieRecord record : calorieRecords) {
            calorieMap.put(record.getRecordDate(), record);
        }

        Map<LocalDate, List<CompletionRecord>> mealMap = new HashMap<>();
        for (CompletionRecord record : mealRecords) {
            mealMap.computeIfAbsent(record.getRecordDate(), key -> new ArrayList<>()).add(record);
        }

        int splitIndex = dates.size() / 2;
        List<Double> firstWindowScores = new ArrayList<>();
        List<Double> secondWindowScores = new ArrayList<>();

        for (int i = 0; i < dates.size(); i++) {
            LocalDate date = dates.get(i);
            double dailyScore = calculateDailyNutritionScore(user, calorieMap.get(date), mealMap.getOrDefault(date, Collections.emptyList()));
            if (i < splitIndex) {
                firstWindowScores.add(dailyScore);
            } else {
                secondWindowScores.add(dailyScore);
            }
        }

        double firstAvg = firstWindowScores.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double secondAvg = secondWindowScores.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        return (int) Math.round(secondAvg - firstAvg);
    }

    private double calculateDailyNutritionScore(User user, CalorieRecord calorieRecord, List<CompletionRecord> mealRecords) {
        List<Double> scoreParts = new ArrayList<>();

        if (user != null && user.getTargetCalories() != null && user.getTargetCalories() > 0 && calorieRecord != null) {
            double target = user.getTargetCalories();
            double intake = calorieRecord.getCalorieIntake() == null ? 0 : calorieRecord.getCalorieIntake();
            double diffRatio = Math.min(1.0, Math.abs(intake - target) / target);
            scoreParts.add(100 - diffRatio * 100);
        }

        if (!mealRecords.isEmpty()) {
            long completedMeals = mealRecords.stream().filter(record -> Boolean.TRUE.equals(record.getCompleted())).count();
            scoreParts.add((completedMeals * 100.0) / mealRecords.size());
        }

        if (scoreParts.isEmpty()) {
            return 0;
        }

        return scoreParts.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private double resolveGoalWeight(User user, Double currentWeight) {
        if (user != null && user.getGoalWeight() != null && user.getGoalWeight() > 0) {
            return user.getGoalWeight();
        }
        if (user == null || currentWeight == null || currentWeight <= 0) {
            return 70.0;
        }
        if ("Lose weight".equalsIgnoreCase(user.getGoal())) {
            return Math.max(30.0, currentWeight - 5.0);
        }
        if ("Build muscle".equalsIgnoreCase(user.getGoal())) {
            return currentWeight + 3.0;
        }
        return currentWeight;
    }

    private double resolveGoalBodyFat(User user, Double currentBodyFat) {
        if (user != null && user.getGoalBodyFatRate() != null && user.getGoalBodyFatRate() > 0) {
            return user.getGoalBodyFatRate();
        }
        if (currentBodyFat != null && currentBodyFat > 0) {
            return Math.max(8.0, currentBodyFat - 3.0);
        }
        return 18.0;
    }

    private double roundDouble(Double value) {
        if (value == null) {
            return 0.0;
        }
        return Math.round(value * 10.0) / 10.0;
    }
}
