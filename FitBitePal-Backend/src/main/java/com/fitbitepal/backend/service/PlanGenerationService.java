package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 计划生成服务 - 生成训练和饮食计划
 */
@Service
@RequiredArgsConstructor
public class PlanGenerationService {
    
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    
    /**
     * 生成训练计划 - 为一周7天生成不同的训练
     */
    @Transactional
    public List<TrainingPlan> generateTrainingPlan(User user) {
        // 删除旧计划
        trainingPlanRepository.deleteByUserId(user.getId());
        
        List<TrainingPlan> plans = new ArrayList<>();
        String goal = user.getGoal();
        int durationMin = user.getTrainingDuration() != null ? user.getTrainingDuration() : 30;
        
        // 根据目标选择不同的训练动作，为每天分配不同的训练
        if ("Lose weight".equals(goal)) {
            // 减脂计划: 有氧为主，每天不同的有氧训练
            // 周一: 跳跃+跑步
            plans.add(createPlan(user.getId(), "Jumping Jacks", "5 min", 50, 1, 1));
            plans.add(createPlan(user.getId(), "Running", durationMin * 50 / 100 + " min", 150, 1, 2));
            
            // 周二: HIIT训练
            plans.add(createPlan(user.getId(), "Burpees", "3 min", 40, 2, 1));
            plans.add(createPlan(user.getId(), "Mountain Climbers", durationMin * 40 / 100 + " min", 100, 2, 2));
            plans.add(createPlan(user.getId(), "High Knees", "3 min", 35, 2, 3));
            
            // 周三: 轻度恢复
            plans.add(createPlan(user.getId(), "Walking", durationMin + " min", 80, 3, 1));
            plans.add(createPlan(user.getId(), "Stretching", "10 min", 20, 3, 2));
            
            // 周四: 有氧+核心
            plans.add(createPlan(user.getId(), "Jump Rope", "5 min", 60, 4, 1));
            plans.add(createPlan(user.getId(), "Cycling", durationMin * 50 / 100 + " min", 120, 4, 2));
            plans.add(createPlan(user.getId(), "Plank", "2 min × 3", 30, 4, 3));
            
            // 周五: 全身燃脂
            plans.add(createPlan(user.getId(), "Burpees", "4 min", 50, 5, 1));
            plans.add(createPlan(user.getId(), "Running", durationMin * 40 / 100 + " min", 130, 5, 2));
            plans.add(createPlan(user.getId(), "Jumping Jacks", "3 min", 35, 5, 3));
            
            // 周六: 户外活动
            plans.add(createPlan(user.getId(), "Hiking", durationMin * 60 / 100 + " min", 150, 6, 1));
            plans.add(createPlan(user.getId(), "Swimming", durationMin * 40 / 100 + " min", 180, 6, 2));
            
            // 周日: 休息日（轻度活动）
            plans.add(createPlan(user.getId(), "Yoga", "20 min", 40, 7, 1));
            plans.add(createPlan(user.getId(), "Walking", "15 min", 30, 7, 2));
            
        } else if ("Build muscle".equals(goal)) {
            // 增肌计划: 分化训练，每天练不同部位
            // 周一: 胸+三头
            plans.add(createPlan(user.getId(), "Bench Press", "10 reps × 4", 90, 1, 1));
            plans.add(createPlan(user.getId(), "Push-ups", "15 reps × 4", 50, 1, 2));
            plans.add(createPlan(user.getId(), "Tricep Dips", "12 reps × 3", 40, 1, 3));
            
            // 周二: 背+二头
            plans.add(createPlan(user.getId(), "Deadlifts", "8 reps × 4", 100, 2, 1));
            plans.add(createPlan(user.getId(), "Pull-ups", "8 reps × 4", 60, 2, 2));
            plans.add(createPlan(user.getId(), "Bicep Curls", "12 reps × 3", 35, 2, 3));
            
            // 周三: 腿部
            plans.add(createPlan(user.getId(), "Squats", "12 reps × 4", 110, 3, 1));
            plans.add(createPlan(user.getId(), "Lunges", "10 reps × 4", 80, 3, 2));
            plans.add(createPlan(user.getId(), "Leg Press", "15 reps × 3", 90, 3, 3));
            
            // 周四: 肩部
            plans.add(createPlan(user.getId(), "Shoulder Press", "10 reps × 4", 70, 4, 1));
            plans.add(createPlan(user.getId(), "Lateral Raises", "12 reps × 3", 40, 4, 2));
            plans.add(createPlan(user.getId(), "Front Raises", "12 reps × 3", 35, 4, 3));
            
            // 周五: 全身力量
            plans.add(createPlan(user.getId(), "Deadlifts", "8 reps × 3", 90, 5, 1));
            plans.add(createPlan(user.getId(), "Bench Press", "10 reps × 3", 80, 5, 2));
            plans.add(createPlan(user.getId(), "Squats", "12 reps × 3", 100, 5, 3));
            
            // 周六: 核心+有氧
            plans.add(createPlan(user.getId(), "Plank", "2 min × 4", 40, 6, 1));
            plans.add(createPlan(user.getId(), "Russian Twists", "20 reps × 3", 30, 6, 2));
            plans.add(createPlan(user.getId(), "Running", "15 min", 100, 6, 3));
            
            // 周日: 休息日（拉伸）
            plans.add(createPlan(user.getId(), "Stretching", "15 min", 20, 7, 1));
            plans.add(createPlan(user.getId(), "Foam Rolling", "10 min", 15, 7, 2));
            
        } else {
            // 保持健康/塑形: 力量+有氧混合
            // 周一: 上肢力量
            plans.add(createPlan(user.getId(), "Push-ups", "15 reps × 3", 50, 1, 1));
            plans.add(createPlan(user.getId(), "Dumbbell Rows", "12 reps × 3", 45, 1, 2));
            plans.add(createPlan(user.getId(), "Shoulder Press", "10 reps × 3", 40, 1, 3));
            
            // 周二: 下肢力量
            plans.add(createPlan(user.getId(), "Squats", "20 reps × 3", 70, 2, 1));
            plans.add(createPlan(user.getId(), "Lunges", "12 reps × 3", 55, 2, 2));
            plans.add(createPlan(user.getId(), "Calf Raises", "20 reps × 3", 30, 2, 3));
            
            // 周三: 核心训练
            plans.add(createPlan(user.getId(), "Plank", "2 min × 3", 35, 3, 1));
            plans.add(createPlan(user.getId(), "Crunches", "20 reps × 3", 30, 3, 2));
            plans.add(createPlan(user.getId(), "Leg Raises", "15 reps × 3", 25, 3, 3));
            
            // 周四: 有氧训练
            plans.add(createPlan(user.getId(), "Running", durationMin * 50 / 100 + " min", 120, 4, 1));
            plans.add(createPlan(user.getId(), "Jump Rope", "5 min", 50, 4, 2));
            
            // 周五: 全身训练
            plans.add(createPlan(user.getId(), "Burpees", "3 min", 40, 5, 1));
            plans.add(createPlan(user.getId(), "Mountain Climbers", "3 min", 35, 5, 2));
            plans.add(createPlan(user.getId(), "Jumping Jacks", "3 min", 30, 5, 3));
            
            // 周六: 柔韧性训练
            plans.add(createPlan(user.getId(), "Yoga", durationMin + " min", 60, 6, 1));
            plans.add(createPlan(user.getId(), "Stretching", "15 min", 20, 6, 2));
            
            // 周日: 轻度活动
            plans.add(createPlan(user.getId(), "Walking", "30 min", 60, 7, 1));
            plans.add(createPlan(user.getId(), "Tai Chi", "20 min", 40, 7, 2));
        }
        
        return trainingPlanRepository.saveAll(plans);
    }
    
    /**
     * 生成饮食计划 - 新格式（包含详细食材列表）
     */
    @Transactional
    public List<DietPlan> generateDietPlan(User user) {
        // 删除旧计划
        dietPlanRepository.deleteByUserId(user.getId());
        
        List<DietPlan> plans = new ArrayList<>();
        int targetCal = user.getTargetCalories() != null ? user.getTargetCalories() : 2000;
        
        // 分配三餐热量: 早30%, 午40%, 晚30%
        int breakfast = (int) Math.round(targetCal * 0.3);
        int lunch = (int) Math.round(targetCal * 0.4);
        int dinner = (int) Math.round(targetCal * 0.3);
        
        // 早餐 - 燕麦碗
        plans.add(createDietPlanWithIngredients(user.getId(), "Oatmeal Bowl", "08:00", breakfast,
                "[{\"name\":\"Oatmeal\",\"amount\":\"80g\"},{\"name\":\"Banana\",\"amount\":\"1 medium\"},{\"name\":\"Almond milk\",\"amount\":\"200ml\"},{\"name\":\"Honey\",\"amount\":\"10g\"}]",
                (int)(breakfast * 0.25 / 4), (int)(breakfast * 0.5 / 4), (int)(breakfast * 0.25 / 9)));
        
        // 午餐 - 烤鸡胸肉沙拉
        plans.add(createDietPlanWithIngredients(user.getId(), "Grilled Chicken Breast Salad", "12:30", lunch,
                "[{\"name\":\"Chicken breast\",\"amount\":\"150g\"},{\"name\":\"Mixed vegetables\",\"amount\":\"100g\"},{\"name\":\"Olive oil\",\"amount\":\"5g\"},{\"name\":\"Quinoa\",\"amount\":\"50g\"}]",
                (int)(lunch * 0.35 / 4), (int)(lunch * 0.4 / 4), (int)(lunch * 0.25 / 9)));
        
        // 晚餐 - 三文鱼配蔬菜
        plans.add(createDietPlanWithIngredients(user.getId(), "Salmon with Vegetables", "18:30", dinner,
                "[{\"name\":\"Salmon fillet\",\"amount\":\"180g\"},{\"name\":\"Broccoli\",\"amount\":\"150g\"},{\"name\":\"Sweet potato\",\"amount\":\"200g\"},{\"name\":\"Lemon juice\",\"amount\":\"15ml\"}]",
                (int)(dinner * 0.35 / 4), (int)(dinner * 0.35 / 4), (int)(dinner * 0.3 / 9)));
        
        return dietPlanRepository.saveAll(plans);
    }
    
    /**
     * 创建训练计划
     */
    private TrainingPlan createPlan(Long userId, String name, String duration, 
                                    int calories, int dayOfWeek, int orderIndex) {
        TrainingPlan plan = new TrainingPlan();
        plan.setUserId(userId);
        plan.setExerciseName(name);
        plan.setDuration(duration);
        plan.setCalories(calories);
        plan.setDayOfWeek(dayOfWeek);
        plan.setOrderIndex(orderIndex);
        plan.setImageUrl("/images/exercise-" + orderIndex + ".png");
        return plan;
    }
    
    /**
     * 创建饮食计划（旧方法，已废弃）
     * @deprecated 使用 createDietPlanWithIngredients 代替
     */
    @Deprecated
    private DietPlan createDietPlan(Long userId, String mealType, String mealTime, 
                                    int calories, String foods, int protein, int carbs, int fat) {
        DietPlan plan = new DietPlan();
        plan.setUserId(userId);
        plan.setMealType(mealType);
        plan.setMealTime(mealTime);
        plan.setCalories(calories);
        plan.setFoods(foods);
        plan.setProtein(protein);
        plan.setCarbs(carbs);
        plan.setFat(fat);
        return plan;
    }
    
    /**
     * 创建饮食计划 - 新格式（包含详细食材列表）
     */
    private DietPlan createDietPlanWithIngredients(Long userId, String mealType, String mealTime, 
                                                   int calories, String ingredients, int protein, int carbs, int fat) {
        DietPlan plan = new DietPlan();
        plan.setUserId(userId);
        plan.setMealType(mealType);
        plan.setMealTime(mealTime);
        plan.setCalories(calories);
        plan.setIngredients(ingredients);  // 使用新的 ingredients 字段
        plan.setFoods("[]");  // 保留旧字段为空数组，保持兼容性
        plan.setProtein(protein);
        plan.setCarbs(carbs);
        plan.setFat(fat);
        return plan;
    }
}

