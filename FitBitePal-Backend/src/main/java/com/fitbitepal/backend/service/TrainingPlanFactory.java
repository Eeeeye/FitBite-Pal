package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.model.TrainingPlan;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
class TrainingPlanFactory {
    List<TrainingPlan> create(User user, LocalDate date) {
        Long userId = user.getId();
        int duration = user.getTrainingDuration() == null ? 30 : user.getTrainingDuration();
        if (user.getTrainingArea() != null && !user.getTrainingArea().isEmpty()) {
            return generatePlanByArea(userId, date, duration, user.getTrainingArea(), user.getTrainingIntensity());
        }
        int offset = date.getDayOfWeek().getValue() % 4;
        if ("Lose weight".equals(user.getGoal())) {
            return generateLoseWeightPlan(userId, date, duration, offset);
        }
        if ("Build muscle".equals(user.getGoal())) {
            return generateBuildMusclePlan(userId, date, duration, offset);
        }
        return generateKeepFitPlan(userId, date, duration, offset);
    }

    private List<TrainingPlan> generatePlanByArea(Long userId, LocalDate planDate,
                                                  int duration, String area, String intensity) {
        List<TrainingPlan> plans = new ArrayList<>();

        // 根据强度调整卡路里系数
        double intensityMultiplier = getIntensityMultiplier(intensity);

        switch (area) {
            case "Upper body":
                plans.addAll(generateUpperBodyPlan(userId, planDate, duration, intensityMultiplier));
                break;
            case "Lower body":
                plans.addAll(generateLowerBodyPlan(userId, planDate, duration, intensityMultiplier));
                break;
            case "Core":
                plans.addAll(generateCorePlan(userId, planDate, duration, intensityMultiplier));
                break;
            case "Full body":
            default:
                plans.addAll(generateFullBodyPlan(userId, planDate, duration, intensityMultiplier));
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
                                                     int duration, double multiplier) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", (int)(40 * multiplier), 1));
        plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", (int)(35 * multiplier), 2));
        plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "10 reps × 3", (int)(32 * multiplier), 3));
        plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", (int)(30 * multiplier), 4));
        plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", (int)(28 * multiplier), 5));
        plans.add(createPlanWithDate(userId, planDate, "Lateral Raises", "12 reps × 3", (int)(25 * multiplier), 6));
        plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", (int)(15 * multiplier), 7));
        plans.add(createPlanWithDate(userId, planDate, "Upper Body Stretch", "5 min", (int)(12 * multiplier), 8));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Diamond Push-ups", "10 reps × 4", (int)(55 * multiplier), 9));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Pike Push-ups", "8 reps × 4", (int)(50 * multiplier), 10));
        return plans;
    }

    /**
     * 下肢训练计划
     */
    private List<TrainingPlan> generateLowerBodyPlan(Long userId, LocalDate planDate,
                                                     int duration, double multiplier) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", (int)(48 * multiplier), 1));
        plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", (int)(40 * multiplier), 2));
        plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", (int)(25 * multiplier), 3));
        plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", (int)(28 * multiplier), 4));
        plans.add(createPlanWithDate(userId, planDate, "Step-ups", "12 reps × 3", (int)(35 * multiplier), 5));
        plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", (int)(30 * multiplier), 6));
        plans.add(createPlanWithDate(userId, planDate, "Side Lunges", "10 reps × 3", (int)(32 * multiplier), 7));
        plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", (int)(12 * multiplier), 8));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Jump Squats", "12 reps × 4", (int)(68 * multiplier), 9));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Bulgarian Split Squats", "10 reps × 4", (int)(65 * multiplier), 10));
        return plans;
    }

    /**
     * 核心训练计划
     */
    private List<TrainingPlan> generateCorePlan(Long userId, LocalDate planDate,
                                                int duration, double multiplier) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", (int)(30 * multiplier), 1));
        plans.add(createPlanWithDate(userId, planDate, "Crunches", "20 reps × 3", (int)(25 * multiplier), 2));
        plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", (int)(22 * multiplier), 3));
        plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", (int)(28 * multiplier), 4));
        plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", (int)(20 * multiplier), 5));
        plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", (int)(25 * multiplier), 6));
        plans.add(createPlanWithDate(userId, planDate, "Bird Dog", "10 reps × 3", (int)(18 * multiplier), 7));
        plans.add(createPlanWithDate(userId, planDate, "Core Stretching", "5 min", (int)(12 * multiplier), 8));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ V-ups", "15 reps × 4", (int)(45 * multiplier), 9));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Mountain Climbers", "5 min", (int)(55 * multiplier), 10));
        return plans;
    }

    /**
     * 全身训练计划
     */
    private List<TrainingPlan> generateFullBodyPlan(Long userId, LocalDate planDate,
                                                    int duration, double multiplier) {
        List<TrainingPlan> plans = new ArrayList<>();
        plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", (int)(30 * multiplier), 1));
        plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", (int)(40 * multiplier), 2));
        plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", (int)(38 * multiplier), 3));
        plans.add(createPlanWithDate(userId, planDate, "Lunges", "10 reps × 3", (int)(35 * multiplier), 4));
        plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", (int)(25 * multiplier), 5));
        plans.add(createPlanWithDate(userId, planDate, "High Knees", "2 min", (int)(28 * multiplier), 6));
        plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", (int)(32 * multiplier), 7));
        plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", (int)(15 * multiplier), 8));
        // 高难度附加
        plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", (int)(62 * multiplier), 9));
        plans.add(createPlanWithDate(userId, planDate, "⚡ Running Intervals", "8 min", (int)(75 * multiplier), 10));
        return plans;
    }

    /**
     * 生成减脂计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateLoseWeightPlan(Long userId, LocalDate planDate,
                                                     int duration, int dayOffset) {
        List<TrainingPlan> plans = new ArrayList<>();

        // 根据 dayOffset (0-3) 选择不同的训练组合
        switch (dayOffset % 4) {
            case 0: // 第0天: 有氧燃脂日
                // 普通难度 (8个)
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 30, 1));
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "3 min", 35, 2));
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "5 min", 50, 3));
                plans.add(createPlanWithDate(userId, planDate, "Jogging in Place", "5 min", 45, 4));
                plans.add(createPlanWithDate(userId, planDate, "Side Shuffle", "3 min", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", 15, 6));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", 25, 7));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 20, 8));
                // 高难度附加 (2个)
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running", duration * 30 / 100 + " min", 90, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 60, 10));
                break;
            case 1: // 第1天: HIIT爆发日
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "3 min", 35, 1));
                plans.add(createPlanWithDate(userId, planDate, "Butt Kicks", "3 min", 32, 2));
                plans.add(createPlanWithDate(userId, planDate, "Skater Hops", "3 min", 40, 3));
                plans.add(createPlanWithDate(userId, planDate, "Jumping Lunges", "2 min", 38, 4));
                plans.add(createPlanWithDate(userId, planDate, "Plank Jacks", "2 min", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "10 reps × 3", 35, 6));
                plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", 25, 7));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Walk", "3 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Mountain Climbers", "6 min", 80, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpee Tuck Jumps", "4 min", 65, 10));
                break;
            case 2: // 第2天: 有氧+核心
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "4 min", 42, 1));
                plans.add(createPlanWithDate(userId, planDate, "Jogging", "5 min", 48, 2));
                plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", 20, 3));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 25, 4));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 5));
                plans.add(createPlanWithDate(userId, planDate, "Superman Hold", "1 min × 3", 18, 6));
                plans.add(createPlanWithDate(userId, planDate, "Cat-Cow Stretch", "2 min", 12, 7));
                plans.add(createPlanWithDate(userId, planDate, "Deep Breathing", "3 min", 8, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Cycling", duration * 30 / 100 + " min", 75, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Plank to Pike", "3 min", 45, 10));
                break;
            case 3: // 第3天: 全身综合
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 30, 1));
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 40, 2));
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 38, 3));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "10 reps × 3", 35, 4));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 2", 25, 5));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 6));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 20, 7));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 18, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running Intervals", "8 min", 85, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 62, 10));
                break;
        }

        return plans;
    }

    /**
     * 生成增肌计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateBuildMusclePlan(Long userId, LocalDate planDate,
                                                      int duration, int dayOffset) {
        List<TrainingPlan> plans = new ArrayList<>();

        switch (dayOffset % 4) {
            case 0: // 第0天: 胸+三头
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 42, 1));
                plans.add(createPlanWithDate(userId, planDate, "Diamond Push-ups", "10 reps × 3", 38, 2));
                plans.add(createPlanWithDate(userId, planDate, "Chest Press", "12 reps × 3", 48, 3));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Dips", "10 reps × 3", 40, 4));
                plans.add(createPlanWithDate(userId, planDate, "Chest Fly", "12 reps × 3", 35, 5));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", 30, 6));
                plans.add(createPlanWithDate(userId, planDate, "Incline Push-ups", "15 reps × 3", 32, 7));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Stretch", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Bench Press", "10 reps × 4", 68, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Explosive Push-ups", "8 reps × 4", 55, 10));
                break;
            case 1: // 第1天: 背+二头
                plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", 45, 1));
                plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", 35, 2));
                plans.add(createPlanWithDate(userId, planDate, "Lat Pulldown", "12 reps × 3", 48, 3));
                plans.add(createPlanWithDate(userId, planDate, "Hammer Curls", "12 reps × 3", 32, 4));
                plans.add(createPlanWithDate(userId, planDate, "Reverse Fly", "12 reps × 3", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Face Pulls", "15 reps × 3", 25, 6));
                plans.add(createPlanWithDate(userId, planDate, "Shrugs", "15 reps × 3", 30, 7));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Deadlifts", "8 reps × 4", 78, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Pull-ups", "8 reps × 4", 60, 10));
                break;
            case 2: // 第2天: 腿部
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 52, 1));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", 45, 2));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 3));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 25, 4));
                plans.add(createPlanWithDate(userId, planDate, "Step-ups", "12 reps × 3", 38, 5));
                plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", 32, 6));
                plans.add(createPlanWithDate(userId, planDate, "Side Lunges", "10 reps × 3", 35, 7));
                plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Bulgarian Split Squats", "10 reps × 4", 68, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Leg Press", "15 reps × 4", 85, 10));
                break;
            case 3: // 第3天: 肩部+核心
                plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "12 reps × 3", 42, 1));
                plans.add(createPlanWithDate(userId, planDate, "Lateral Raises", "12 reps × 3", 32, 2));
                plans.add(createPlanWithDate(userId, planDate, "Front Raises", "12 reps × 3", 30, 3));
                plans.add(createPlanWithDate(userId, planDate, "Arnold Press", "10 reps × 3", 40, 4));
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 25, 6));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 7));
                plans.add(createPlanWithDate(userId, planDate, "Stretching", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Military Press", "10 reps × 4", 58, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Handstand Push-ups", "6 reps × 3", 50, 10));
                break;
        }

        return plans;
    }

    /**
     * 生成保持健康计划（10个动作：8个普通 + 2个高难度附加）
     */
    private List<TrainingPlan> generateKeepFitPlan(Long userId, LocalDate planDate,
                                                  int duration, int dayOffset) {
        List<TrainingPlan> plans = new ArrayList<>();

        switch (dayOffset % 4) {
            case 0: // 第0天: 上肢力量
                plans.add(createPlanWithDate(userId, planDate, "Push-ups", "12 reps × 3", 40, 1));
                plans.add(createPlanWithDate(userId, planDate, "Dumbbell Rows", "12 reps × 3", 35, 2));
                plans.add(createPlanWithDate(userId, planDate, "Shoulder Press", "10 reps × 3", 32, 3));
                plans.add(createPlanWithDate(userId, planDate, "Bicep Curls", "12 reps × 3", 30, 4));
                plans.add(createPlanWithDate(userId, planDate, "Tricep Extensions", "12 reps × 3", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Arm Circles", "2 min", 18, 6));
                plans.add(createPlanWithDate(userId, planDate, "Wrist Rolls", "1 min", 10, 7));
                plans.add(createPlanWithDate(userId, planDate, "Upper Body Stretch", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Decline Push-ups", "10 reps × 4", 55, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Dumbbell Press", "10 reps × 4", 60, 10));
                break;
            case 1: // 第1天: 下肢力量
                plans.add(createPlanWithDate(userId, planDate, "Squats", "15 reps × 3", 48, 1));
                plans.add(createPlanWithDate(userId, planDate, "Lunges", "12 reps × 3", 40, 2));
                plans.add(createPlanWithDate(userId, planDate, "Calf Raises", "20 reps × 3", 25, 3));
                plans.add(createPlanWithDate(userId, planDate, "Wall Sit", "1 min × 3", 28, 4));
                plans.add(createPlanWithDate(userId, planDate, "Step-ups", "10 reps × 3", 35, 5));
                plans.add(createPlanWithDate(userId, planDate, "Glute Bridges", "15 reps × 3", 30, 6));
                plans.add(createPlanWithDate(userId, planDate, "Ankle Rolls", "1 min", 10, 7));
                plans.add(createPlanWithDate(userId, planDate, "Leg Stretching", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Jump Squats", "12 reps × 4", 68, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Pistol Squats", "8 reps × 3", 65, 10));
                break;
            case 2: // 第2天: 核心训练
                plans.add(createPlanWithDate(userId, planDate, "Plank", "2 min × 3", 30, 1));
                plans.add(createPlanWithDate(userId, planDate, "Crunches", "20 reps × 3", 25, 2));
                plans.add(createPlanWithDate(userId, planDate, "Leg Raises", "15 reps × 3", 22, 3));
                plans.add(createPlanWithDate(userId, planDate, "Russian Twists", "20 reps × 3", 28, 4));
                plans.add(createPlanWithDate(userId, planDate, "Side Plank", "1 min × 2", 20, 5));
                plans.add(createPlanWithDate(userId, planDate, "Bicycle Crunches", "20 reps × 3", 25, 6));
                plans.add(createPlanWithDate(userId, planDate, "Bird Dog", "10 reps × 3", 18, 7));
                plans.add(createPlanWithDate(userId, planDate, "Core Stretching", "5 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ V-ups", "15 reps × 4", 45, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Dragon Flag", "8 reps × 3", 50, 10));
                break;
            case 3: // 第3天: 有氧训练
                plans.add(createPlanWithDate(userId, planDate, "Jogging", "5 min", 45, 1));
                plans.add(createPlanWithDate(userId, planDate, "Jump Rope", "3 min", 38, 2));
                plans.add(createPlanWithDate(userId, planDate, "Jumping Jacks", "3 min", 35, 3));
                plans.add(createPlanWithDate(userId, planDate, "High Knees", "2 min", 30, 4));
                plans.add(createPlanWithDate(userId, planDate, "Butt Kicks", "2 min", 28, 5));
                plans.add(createPlanWithDate(userId, planDate, "Side Shuffle", "2 min", 25, 6));
                plans.add(createPlanWithDate(userId, planDate, "Walking Lunges", "2 min", 32, 7));
                plans.add(createPlanWithDate(userId, planDate, "Cool Down Walk", "3 min", 15, 8));
                // 高难度附加
                plans.add(createPlanWithDate(userId, planDate, "⚡ Running", duration * 30 / 100 + " min", 80, 9));
                plans.add(createPlanWithDate(userId, planDate, "⚡ Burpees", "5 min", 62, 10));
                break;
        }

        return plans;
    }

    /**
     * 创建带日期的训练计划
     */
    private TrainingPlan createPlanWithDate(Long userId, LocalDate planDate, String name,
                                           String duration, int calories, int orderIndex) {
        TrainingPlan plan = new TrainingPlan();
        plan.setUserId(userId);
        plan.setPlanDate(planDate);
        plan.setExerciseName(name);  // 高难度任务名称已包含 ⚡ 前缀
        plan.setDuration(duration);
        plan.setCalories(calories);
        plan.setOrderIndex(orderIndex);
        plan.setImageUrl("/images/exercise-" + orderIndex + ".png");
        return plan;
    }
}
