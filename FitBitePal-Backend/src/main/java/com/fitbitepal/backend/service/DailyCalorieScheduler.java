package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 每日卡路里记录定时任务
 * 每天23:59自动保存当天的BMR记录到calorie_records表
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyCalorieScheduler {
    
    private final UserRepository userRepository;
    private final CalorieRecordRepository calorieRecordRepository;
    private final CompletionRecordRepository completionRecordRepository;
    
    /**
     * 每天23:59执行
     * cron表达式: 秒 分 时 日 月 周
     * "0 59 23 * * ?" = 每天23:59:00执行
     */
    @Scheduled(cron = "0 59 23 * * ?")
    @Transactional
    public void saveDailyCalorieRecords() {
        log.info("🕛 开始执行每日卡路里记录保存任务...");
        
        LocalDate today = LocalDate.now();
        List<User> allUsers = userRepository.findAll();
        
        int savedCount = 0;
        int skippedCount = 0;
        
        for (User user : allUsers) {
            try {
                // 检查今天是否已经有记录
                boolean exists = calorieRecordRepository
                        .findByUserIdAndRecordDate(user.getId(), today)
                        .isPresent();
                
                if (exists) {
                    log.debug("用户 {} 今天已有卡路里记录，跳过", user.getId());
                    skippedCount++;
                    continue;
                }
                
                // 计算当天的卡路里数据
                CalorieRecord record = calculateDailyCalories(user, today);
                calorieRecordRepository.save(record);
                
                log.info("✅ 为用户 {} 保存卡路里记录: BMR={}, 运动消耗={}, 摄入={}", 
                        user.getId(), record.getBaseMetabolism(), 
                        record.getExerciseCalories(), record.getCalorieIntake());
                savedCount++;
                
            } catch (Exception e) {
                log.error("为用户 {} 保存卡路里记录失败: {}", user.getId(), e.getMessage());
            }
        }
        
        log.info("🎯 每日卡路里记录任务完成: 保存 {} 条，跳过 {} 条", savedCount, skippedCount);
    }
    
    /**
     * 计算用户当天的卡路里数据
     */
    private CalorieRecord calculateDailyCalories(User user, LocalDate date) {
        CalorieRecord record = new CalorieRecord();
        record.setUserId(user.getId());
        record.setRecordDate(date);
        
        // 1. 获取用户的BMR（基础代谢率）
        Integer bmr = user.getBmr() != null ? user.getBmr() : 1500;
        record.setBaseMetabolism(bmr);
        
        // 2. 计算运动消耗
        List<CompletionRecord> exerciseRecords = completionRecordRepository
                .findByUserIdAndRecordDateAndItemType(user.getId(), date, "exercise");
        
        int exerciseCalories = exerciseRecords.stream()
                .filter(CompletionRecord::getCompleted)
                .mapToInt(r -> r.getCalories() != null ? r.getCalories() : 0)
                .sum();
        record.setExerciseCalories(exerciseCalories);
        
        // 3. 计算总消耗 = BMR + 运动消耗
        record.setCalorieExpenditure(bmr + exerciseCalories);
        
        // 4. 计算摄入
        List<CompletionRecord> mealRecords = completionRecordRepository
                .findByUserIdAndRecordDateAndItemType(user.getId(), date, "meal");
        
        int intake = mealRecords.stream()
                .filter(CompletionRecord::getCompleted)
                .mapToInt(r -> r.getCalories() != null ? r.getCalories() : 0)
                .sum();
        record.setCalorieIntake(intake);
        
        return record;
    }
    
    /**
     * 手动触发保存某用户今天的卡路里记录
     * 可以通过API调用来手动执行
     */
    @Transactional
    public CalorieRecord saveUserDailyCalories(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        LocalDate today = LocalDate.now();
        
        // 删除今天已有的记录（如果存在）
        calorieRecordRepository.findByUserIdAndRecordDate(userId, today)
                .ifPresent(calorieRecordRepository::delete);
        
        // 创建新记录
        CalorieRecord record = calculateDailyCalories(user, today);
        return calorieRecordRepository.save(record);
    }
}

