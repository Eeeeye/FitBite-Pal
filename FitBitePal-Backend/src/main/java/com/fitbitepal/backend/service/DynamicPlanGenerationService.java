package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 动态计划生成服务
 * 基于打卡数据动态生成训练计划
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicPlanGenerationService {
    
    private final TrainingPlanRepository trainingPlanRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final UserRepository userRepository;
    
    // 固定生成今天+明天的计划
    private static final int PLAN_GENERATION_DAYS = 2;
    
    /**
     * 为指定用户生成明天的训练计划
     * 
     * 规则：
     * - 使用sourceDate（今天）的数据生成明天的计划
     * - 已生成的计划不会被覆盖
     * 
     * @param userId 用户ID
     * @param sourceDate 数据源日期（通常是今天）
     */
    @Transactional
    public void generatePlanForDay3(Long userId, LocalDate sourceDate) {
        // 改为只生成明天的计划
        generatePlanForNextDay(userId, sourceDate);
    }
    
    /**
     * 为指定用户生成明天的训练计划（优化版）
     */
    @Transactional
    public void generatePlanForNextDay(Long userId, LocalDate sourceDate) {
        LocalDate targetDate = sourceDate.plusDays(1); // 明天
        
        log.info("为用户 {} 生成 {} 的训练计划（基于 {} 的数据）", 
                userId, targetDate, sourceDate);
        
        // 检查该日期是否已有计划（已生成的计划不覆盖）
        List<TrainingPlan> existingPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, targetDate);
        
        if (!existingPlans.isEmpty()) {
            log.info("用户 {} 在 {} 已有计划，跳过生成", userId, targetDate);
            return;
        }
        
        // 获取数据源
        DataSource dataSource = getDataSource(userId, sourceDate);
        if (dataSource == null) {
            log.warn("用户 {} 在 {} 没有可用数据，跳过生成", userId, sourceDate);
            return;
        }
        
        // 计算 dayOffset (0-3，用于产生变化)
        int dayOffset = targetDate.getDayOfWeek().getValue() % 4;
        
        log.info("使用数据源: {}, dayOffset: {}", dataSource.getSourceType(), dayOffset);
        
        // 生成训练计划
        List<TrainingPlan> plans = generateTrainingPlans(
                userId, targetDate, dataSource, dayOffset);
        
        trainingPlanRepository.saveAll(plans);
        log.info("成功为用户 {} 生成 {} 的训练计划（共{}个动作）", 
                userId, targetDate, plans.size());
    }
    
    /**
     * 补齐缺失的计划（今天+明天）
     * 在获取训练计划时调用，确保用户总能看到今天和明天的计划
     */
    @Transactional
    public void fillMissingPlans(Long userId) {
        LocalDate today = LocalDate.now();
        
        log.info("检查并补齐用户 {} 的计划 (今天+明天)", userId);
        
        // 检查并补齐今天和明天的计划
        for (int i = 0; i < PLAN_GENERATION_DAYS; i++) {
            LocalDate planDate = today.plusDays(i);
            
            List<TrainingPlan> existingPlans = trainingPlanRepository
                    .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, planDate);
        
            if (existingPlans.isEmpty()) {
                log.info("用户 {} 在 {} 没有计划，生成中...", userId, planDate);
                generatePlanForDate(userId, planDate);
            }
        }
    }
    
    /**
     * 为指定日期生成计划
     */
    @Transactional
    public void generatePlanForDate(Long userId, LocalDate targetDate) {
        // 获取数据源
        DataSource dataSource = getDataSource(userId, LocalDate.now());
        if (dataSource == null) {
            log.warn("用户 {} 没有可用数据，无法生成计划", userId);
            return;
        }
        
        // 计算 dayOffset
        int dayOffset = targetDate.getDayOfWeek().getValue() % 4;
        
        // 生成训练计划
        List<TrainingPlan> plans = generateTrainingPlans(
                userId, targetDate, dataSource, dayOffset);
        
        trainingPlanRepository.saveAll(plans);
        log.info("成功为用户 {} 生成 {} 的训练计划（共{}个动作）", 
                userId, targetDate, plans.size());
    }
    
    /**
     * ✅ 为指定用户生成计划（直接使用用户对象，避免缓存问题）
     */
    @Transactional
    public void generatePlanForUser(User user, LocalDate targetDate) {
        log.info("为用户 {} 生成计划，使用设置: area={}, intensity={}, duration={}", 
            user.getId(), user.getTrainingArea(), user.getTrainingIntensity(), user.getTrainingDuration());
        
        // 直接从用户对象创建数据源
        DataSource dataSource = DataSource.fromUser(user);
        
        // 计算 dayOffset
        int dayOffset = targetDate.getDayOfWeek().getValue() % 4;
        
        // 生成训练计划
        List<TrainingPlan> plans = generateTrainingPlans(
                user.getId(), targetDate, dataSource, dayOffset);
        
        trainingPlanRepository.saveAll(plans);
        log.info("成功为用户 {} 生成 {} 的训练计划（共{}个动作），区域={}, 强度={}", 
                user.getId(), targetDate, plans.size(), user.getTrainingArea(), user.getTrainingIntensity());
    }
    
    /**
     * 为新用户生成初始计划（今天+明天）
     */
    @Transactional
    public void generateInitialPlans(Long userId) {
        LocalDate today = LocalDate.now();
        log.info("为新用户 {} 生成初始 {} 天计划", userId, PLAN_GENERATION_DAYS);
            
        // 获取数据源
            DataSource dataSource = getDataSource(userId, today);
            if (dataSource == null) {
                log.warn("新用户 {} 没有可用数据", userId);
                return;
        }
        
        // 生成今天+明天的计划
        for (int i = 0; i < PLAN_GENERATION_DAYS; i++) {
            LocalDate planDate = today.plusDays(i);
            
            // 检查是否已有计划
            List<TrainingPlan> existingPlans = trainingPlanRepository
                    .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, planDate);
            if (!existingPlans.isEmpty()) {
                log.info("用户 {} 在 {} 已有计划，跳过", userId, planDate);
                continue;
            }
            
            // 计算 dayOffset
            int dayOffset = planDate.getDayOfWeek().getValue() % 4;
            
            // 生成训练计划
            List<TrainingPlan> plans = generateTrainingPlans(
                    userId, planDate, dataSource, dayOffset);
            
            trainingPlanRepository.saveAll(plans);
            log.info("为新用户 {} 生成 {} 的计划", userId, planDate);
        }
        
        log.info("完成为新用户 {} 生成初始计划", userId);
    }
    
    /**
     * 获取数据源（重构版 - 统一从User表获取）
     * CheckInRecord表已简化为只记录日期，所有身体数据统一从User表获取
     */
    private DataSource getDataSource(Long userId, LocalDate date) {
        // ✅ 直接从User表获取最新数据（唯一数据源）
        Optional<User> user = userRepository.findById(userId);
        
        if (!user.isPresent()) {
            log.warn("❌ 用户 {} 不存在", userId);
            return null;
        }
        
        User u = user.get();
        log.debug("检查用户 {} 的数据: height={}, weight={}, goal={}, activityLevel={}, trainingDuration={}",
            userId, u.getHeight(), u.getWeight(), u.getGoal(), u.getActivityLevel(), u.getTrainingDuration());
        
        if (u.getHeight() == null || u.getWeight() == null) {
            log.warn("❌ 用户 {} 缺少必要的身体数据 (height={}, weight={})", 
                userId, u.getHeight(), u.getWeight());
            return null;
        }
        
        log.info("✅ 从User表获取用户 {} 的数据成功", userId);
        return DataSource.fromUser(u);
    }
    
    /**
     * 数据源封装类
     */
    @Data
    @AllArgsConstructor
    public static class DataSource {
        private Double height;
        private Double weight;
        private String goal;
        private String activityLevel;
        private Integer trainingDuration;
        private String trainingArea;      // 训练区域
        private String trainingIntensity; // 训练强度
        private Long sourceId; // 打卡记录ID或用户ID
        private String sourceType; // "check_in" 或 "user"
        
        /**
         * 从CheckInRecord创建数据源（已废弃）
         * @deprecated CheckInRecord已简化为只记录日期，使用fromUser()代替
         */
        @Deprecated
        public static DataSource fromCheckInRecord(CheckInRecord record) {
            throw new UnsupportedOperationException(
                "CheckInRecord不再存储身体数据，请使用fromUser()");
        }
        
        /**
         * 从User表创建数据源（唯一数据源）
         */
        public static DataSource fromUser(User user) {
            return new DataSource(
                user.getHeight(),
                user.getWeight(),
                user.getGoal(),
                user.getActivityLevel(),
                user.getTrainingDuration(),
                user.getTrainingArea(),
                user.getTrainingIntensity(),
                user.getId(),
                "user"
            );
        }
    }
    
    /**
     * 生成训练计划
     * 优先根据训练区域生成，如果没有设置则根据目标和dayOffset生成
     */
    private List<TrainingPlan> generateTrainingPlans(
            Long userId, LocalDate planDate, DataSource dataSource, int dayOffset) {
        
        String trainingArea = dataSource.getTrainingArea();
        String intensity = dataSource.getTrainingIntensity();
        int duration = dataSource.getTrainingDuration() != null ? 
                      dataSource.getTrainingDuration() : 30;
        
        List<TrainingPlan> plans = new ArrayList<>();
        
        // 优先根据训练区域生成计划
        if (trainingArea != null && !trainingArea.isEmpty()) {
            plans.addAll(generatePlanByArea(userId, planDate, duration, trainingArea, intensity, dataSource.getSourceId()));
        } else {
            // 兼容旧逻辑：根据目标生成
            String goal = dataSource.getGoal() != null ? dataSource.getGoal() : "Keep fit";
        if ("Lose weight".equals(goal)) {
            plans.addAll(generateLoseWeightPlan(
                    userId, planDate, duration, dayOffset, dataSource.getSourceId()));
        } else if ("Build muscle".equals(goal)) {
            plans.addAll(generateBuildMusclePlan(
                    userId, planDate, duration, dayOffset, dataSource.getSourceId()));
        } else {
            plans.addAll(generateKeepFitPlan(
                    userId, planDate, duration, dayOffset, dataSource.getSourceId()));
            }
        }
        
        return plans;
    }
    
    /**
     * 根据训练区域生成计划
     */
    private List<TrainingPlan> generatePlanByArea(Long userId, LocalDate planDate, 
                                                  int duration, String area, String intensity, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        
        // 根据强度调整卡路里系数
        double intensityMultiplier = getIntensityMultiplier(intensity);
        
        switch (area) {
            case "Upper body":
                plans.addAll(generateUpperBodyPlan(userId, planDate, duration, intensityMultiplier, sourceId));
                break;
            case "Lower body":
                plans.addAll(generateLowerBodyPlan(userId, planDate, duration, intensityMultiplier, sourceId));
                break;
            case "Core":
                plans.addAll(generateCorePlan(userId, planDate, duration, intensityMultiplier, sourceId));
                break;
            case "Full body":
            default:
                plans.addAll(generateFullBodyPlan(userId, planDate, duration, intensityMultiplier, sourceId));
                break;
        }
        
        return plans;
    }
    
    /**
     * 获取强度系数
     */
    private double getIntensityMultiplier(String intensity) {
        if (intensity == null) return 1.0;
        switch (intensity) {
            case "Rookie": return 0.6;
            case "Beginner": return 0.8;
            case "Intermediate": return 1.0;
            case "Advanced": return 1.3;
            default: return 1.0;
        }
    }
    
    /**
     * 上肢训练计划
     */
    private List<TrainingPlan> generateUpperBodyPlan(Long userId, LocalDate planDate, 
                                                     int duration, double multiplier, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", (int)(40 * multiplier), 1, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", (int)(35 * multiplier), 2, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "10 reps × 3", (int)(32 * multiplier), 3, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", (int)(30 * multiplier), 4, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", (int)(28 * multiplier), 5, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Lateral Raises", "12 reps × 3", (int)(25 * multiplier), 6, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", (int)(15 * multiplier), 7, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Upper Body Stretch", "5 min", (int)(12 * multiplier), 8, sourceId, false));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Diamond Push-ups", "10 reps × 4", (int)(55 * multiplier), 9, sourceId, true));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Pike Push-ups", "8 reps × 4", (int)(50 * multiplier), 10, sourceId, true));
        return plans;
    }
    
    /**
     * 下肢训练计划
     */
    private List<TrainingPlan> generateLowerBodyPlan(Long userId, LocalDate planDate, 
                                                     int duration, double multiplier, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", (int)(48 * multiplier), 1, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", (int)(40 * multiplier), 2, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", (int)(25 * multiplier), 3, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", (int)(28 * multiplier), 4, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Step-ups", "12 reps × 3", (int)(35 * multiplier), 5, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", (int)(30 * multiplier), 6, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Side Lunges", "10 reps × 3", (int)(32 * multiplier), 7, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", (int)(12 * multiplier), 8, sourceId, false));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Jump Squats", "12 reps × 4", (int)(68 * multiplier), 9, sourceId, true));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Bulgarian Split Squats", "10 reps × 4", (int)(65 * multiplier), 10, sourceId, true));
        return plans;
    }
    
    /**
     * 核心训练计划
     */
    private List<TrainingPlan> generateCorePlan(Long userId, LocalDate planDate, 
                                                int duration, double multiplier, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", (int)(30 * multiplier), 1, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Crunches", "20 reps × 3", (int)(25 * multiplier), 2, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", (int)(22 * multiplier), 3, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", (int)(28 * multiplier), 4, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", (int)(20 * multiplier), 5, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", (int)(25 * multiplier), 6, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Bird Dog", "10 reps × 3", (int)(18 * multiplier), 7, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Core Stretching", "5 min", (int)(12 * multiplier), 8, sourceId, false));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ V-ups", "15 reps × 4", (int)(45 * multiplier), 9, sourceId, true));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Mountain Climbers", "5 min", (int)(55 * multiplier), 10, sourceId, true));
        return plans;
    }
    
    /**
     * 全身训练计划
     */
    private List<TrainingPlan> generateFullBodyPlan(Long userId, LocalDate planDate, 
                                                    int duration, double multiplier, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", (int)(30 * multiplier), 1, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", (int)(40 * multiplier), 2, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", (int)(38 * multiplier), 3, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Lunges", "10 reps × 3", (int)(35 * multiplier), 4, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", (int)(25 * multiplier), 5, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "High Knees", "2 min", (int)(28 * multiplier), 6, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", (int)(32 * multiplier), 7, sourceId, false));
        plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", (int)(15 * multiplier), 8, sourceId, false));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", (int)(62 * multiplier), 9, sourceId, true));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Running Intervals", "8 min", (int)(75 * multiplier), 10, sourceId, true));
        return plans;
    }
    
    /**
     * 生成减脂计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateLoseWeightPlan(Long userId, LocalDate planDate, 
                                                     int duration, int dayOffset, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        
        // 根据 dayOffset (0-3) 选择不同的训练组合
        switch (dayOffset % 4) {
            case 0: // 第0天: 有氧燃脂日
                // 普通难度 (8个)
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 30, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "3 min", 35, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "5 min", 50, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jogging in Place", "5 min", 45, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Side Shuffle", "3 min", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", 15, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", 25, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 20, 8, sourceId, false));
                // 高难度附加 (2个)
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running", duration * 30 / 100 + " min", 90, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 60, 10, sourceId, true));
                break;
            case 1: // 第1天: HIIT爆发日
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "3 min", 35, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Butt Kicks", "3 min", 32, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Skater Hops", "3 min", 40, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jumping Lunges", "2 min", 38, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Plank Jacks", "2 min", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "10 reps × 3", 35, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", 25, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Walk", "3 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Mountain Climbers", "6 min", 80, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpee Tuck Jumps", "4 min", 65, 10, sourceId, true));
                break;
            case 2: // 第2天: 有氧+核心
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "4 min", 42, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jogging", "5 min", 48, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", 20, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 25, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Superman Hold", "1 min × 3", 18, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Cat-Cow Stretch", "2 min", 12, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Deep Breathing", "3 min", 8, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Cycling", duration * 30 / 100 + " min", 75, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Plank to Pike", "3 min", 45, 10, sourceId, true));
                break;
            case 3: // 第3天: 全身综合
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 30, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 40, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 38, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "10 reps × 3", 35, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", 25, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 20, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 18, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running Intervals", "8 min", 85, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 62, 10, sourceId, true));
                break;
        }
        
        return plans;
    }
    
    /**
     * 生成增肌计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateBuildMusclePlan(Long userId, LocalDate planDate, 
                                                      int duration, int dayOffset, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        
        switch (dayOffset % 4) {
            case 0: // 第0天: 胸+三头
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 42, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Diamond Push-ups", "10 reps × 3", 38, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Chest Press", "12 reps × 3", 48, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Dips", "10 reps × 3", 40, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Chest Fly", "12 reps × 3", 35, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", 30, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Incline Push-ups", "15 reps × 3", 32, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Stretch", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Bench Press", "10 reps × 4", 68, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Explosive Push-ups", "8 reps × 4", 55, 10, sourceId, true));
                break;
            case 1: // 第1天: 背+二头
                plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", 45, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", 35, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Lat Pulldown", "12 reps × 3", 48, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Hammer Curls", "12 reps × 3", 32, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Reverse Fly", "12 reps × 3", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Face Pulls", "15 reps × 3", 25, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Shrugs", "15 reps × 3", 30, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Deadlifts", "8 reps × 4", 78, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Pull-ups", "8 reps × 4", 60, 10, sourceId, true));
                break;
            case 2: // 第2天: 腿部
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 52, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", 45, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 25, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Step-ups", "12 reps × 3", 38, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", 32, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Side Lunges", "10 reps × 3", 35, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Bulgarian Split Squats", "10 reps × 4", 68, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Leg Press", "15 reps × 4", 85, 10, sourceId, true));
                break;
            case 3: // 第3天: 肩部+核心
                plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "12 reps × 3", 42, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Lateral Raises", "12 reps × 3", 32, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Front Raises", "12 reps × 3", 30, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Arnold Press", "10 reps × 3", 40, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 25, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Military Press", "10 reps × 4", 58, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Handstand Push-ups", "6 reps × 3", 50, 10, sourceId, true));
                break;
        }
        
        return plans;
    }
    
    /**
     * 生成保持健康计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateKeepFitPlan(Long userId, LocalDate planDate, 
                                                  int duration, int dayOffset, Long sourceId) {
        List<TrainingPlan> plans = new ArrayList<>();
        
        switch (dayOffset % 4) {
            case 0: // 第0天: 上肢力量
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 40, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", 35, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "10 reps × 3", 32, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", 30, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", 18, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Wrist Rolls", "1 min", 10, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Upper Body Stretch", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Decline Push-ups", "10 reps × 4", 55, 9, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Dumbbell Press", "10 reps × 4", 60, 10, sourceId, true));
                break;
            case 1: // 第1天: 下肢力量
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 48, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", 40, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 25, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Step-ups", "10 reps × 3", 35, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", 30, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Ankle Rolls", "1 min", 10, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Jump Squats", "12 reps × 4", 68, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Pistol Squats", "8 reps × 3", 65, 10, sourceId, true));
                break;
            case 2: // 第2天: 核心训练
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", 30, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Crunches", "20 reps × 3", 25, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 28, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", 20, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", 25, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Bird Dog", "10 reps × 3", 18, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Core Stretching", "5 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ V-ups", "15 reps × 4", 45, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Dragon Flag", "8 reps × 3", 50, 10, sourceId, true));
                break;
            case 3: // 第3天: 有氧训练
                plans.add(createPlanWithDate(userId, planDate, "Jogging", "5 min", 45, 1, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "3 min", 38, 2, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 35, 3, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "2 min", 30, 4, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Butt Kicks", "2 min", 28, 5, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Side Shuffle", "2 min", 25, 6, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Walking Lunges", "2 min", 32, 7, sourceId, false));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Walk", "3 min", 15, 8, sourceId, false));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running", duration * 30 / 100 + " min", 80, 9, sourceId, true));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 62, 10, sourceId, true));
                break;
        }
        
        return plans;
    }
    
    /**
     * 创建带日期的训练计划
     * @param isChallenge 是否为高难度附加挑战（已在name中用⚡标记）
     */
    private TrainingPlan createPlanWithDate(Long userId, LocalDate planDate, String name, 
                                           String duration, int calories, int orderIndex, Long sourceId, boolean isChallenge) {
        TrainingPlan plan = new TrainingPlan();
        plan.setUserId(userId);
        plan.setPlanDate(planDate);
        plan.setExerciseName(name);  // 高难度任务名称已包含 ⚡ 前缀
        plan.setDuration(duration);
        plan.setCalories(calories);
        plan.setOrderIndex(orderIndex);
        plan.setSourceCheckInId(sourceId);
        plan.setImageUrl("/images/exercise-" + orderIndex + ".png");
        return plan;
    }
}

