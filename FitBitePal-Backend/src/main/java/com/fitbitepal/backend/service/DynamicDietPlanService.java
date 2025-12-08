package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.MealSet;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.MealSetRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 动态饮食计划生成服务
 * 从数据库读取套餐数据，根据用户目标动态生成每日饮食推荐
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicDietPlanService {

    private final DietPlanRepository dietPlanRepository;
    private final UserRepository userRepository;
    private final MealSetRepository mealSetRepository;

    private final Random random = new Random();

    /**
     * 为用户生成指定日期的饮食计划
     * 从数据库读取套餐数据
     */
    @Transactional
    public List<DietPlan> generateDietPlanForDate(Long userId, LocalDate planDate) {
        log.info("为用户 {} 生成 {} 的饮食计划", userId, planDate);

        // 检查是否已有该日期的计划
        List<DietPlan> existingPlans = dietPlanRepository
                .findByUserIdAndPlanDateOrderByMealTimeAsc(userId, planDate);
        if (!existingPlans.isEmpty()) {
            log.info("用户 {} 在 {} 已有饮食计划，跳过生成", userId, planDate);
            return existingPlans;
        }

        // 获取用户信息
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("用户 {} 不存在", userId);
            return new ArrayList<>();
        }

        String goal = user.getGoal() != null ? user.getGoal() : "Keep fit";
        int targetCalories = user.getTargetCalories() != null ? user.getTargetCalories() : 2000;

        // 使用日期作为随机种子，确保同一天获取的菜单一致
        int seed = planDate.hashCode() + userId.intValue();
        Random dayRandom = new Random(seed);

        List<DietPlan> plans = new ArrayList<>();

        // 从数据库获取对应目标的套餐
        List<MealSet> breakfastSets = mealSetRepository.findByGoalTypeAndMealTypeAndEnabledTrue(goal, "Breakfast");
        List<MealSet> lunchSets = mealSetRepository.findByGoalTypeAndMealTypeAndEnabledTrue(goal, "Lunch");
        List<MealSet> dinnerSets = mealSetRepository.findByGoalTypeAndMealTypeAndEnabledTrue(goal, "Dinner");

        // 如果数据库没有数据，使用默认套餐
        if (breakfastSets.isEmpty() || lunchSets.isEmpty() || dinnerSets.isEmpty()) {
            log.warn("数据库中没有足够的套餐数据，目标: {}，将尝试获取所有可用套餐", goal);
            // 获取任意目标的套餐作为后备
            if (breakfastSets.isEmpty()) {
                breakfastSets = mealSetRepository.findByMealTypeAndEnabledTrue("Breakfast");
            }
            if (lunchSets.isEmpty()) {
                lunchSets = mealSetRepository.findByMealTypeAndEnabledTrue("Lunch");
            }
            if (dinnerSets.isEmpty()) {
                dinnerSets = mealSetRepository.findByMealTypeAndEnabledTrue("Dinner");
            }
        }

        // 如果仍然没有数据，返回空列表
        if (breakfastSets.isEmpty() || lunchSets.isEmpty() || dinnerSets.isEmpty()) {
            log.error("数据库中没有任何套餐数据，请先初始化食品库");
            return new ArrayList<>();
        }

        // 随机选择套餐
        MealSet breakfast = breakfastSets.get(dayRandom.nextInt(breakfastSets.size()));
        MealSet lunch = lunchSets.get(dayRandom.nextInt(lunchSets.size()));
        MealSet dinner = dinnerSets.get(dayRandom.nextInt(dinnerSets.size()));

        // 热量比例调整系数 (早30%, 午40%, 晚30%)
        double totalBaseCalories = breakfast.getCalories() + lunch.getCalories() + dinner.getCalories();
        double calorieRatio = targetCalories / totalBaseCalories;

        // 创建早餐计划
        plans.add(createDietPlanFromMealSet(userId, planDate, "Breakfast", "08:00", breakfast, calorieRatio));

        // 创建午餐计划
        plans.add(createDietPlanFromMealSet(userId, planDate, "Lunch", "12:30", lunch, calorieRatio));

        // 创建晚餐计划
        plans.add(createDietPlanFromMealSet(userId, planDate, "Dinner", "18:30", dinner, calorieRatio));

        dietPlanRepository.saveAll(plans);
        log.info("成功为用户 {} 生成 {} 的饮食计划（共3餐），来源: 数据库套餐", userId, planDate);

        return plans;
    }

    /**
     * 从MealSet创建DietPlan
     */
    private DietPlan createDietPlanFromMealSet(Long userId, LocalDate planDate, String mealType,
                                                String mealTime, MealSet mealSet, double calorieRatio) {
        DietPlan plan = new DietPlan();
        plan.setUserId(userId);
        plan.setPlanDate(planDate);
        plan.setMealName(mealSet.getName());
        plan.setMealType(mealType);
        plan.setMealTime(mealTime);
        plan.setIngredients(mealSet.getIngredients());
        plan.setCalories((int) Math.round(mealSet.getCalories() * calorieRatio));
        plan.setProtein((int) Math.round(mealSet.getProtein() * calorieRatio));
        plan.setCarbs((int) Math.round(mealSet.getCarbs() * calorieRatio));
        plan.setFat((int) Math.round(mealSet.getFat() * calorieRatio));
        plan.setFoods("[]");
        plan.setCreatedAt(LocalDateTime.now());
        return plan;
    }

    /**
     * 补齐缺失的饮食计划（今天+明天）
     */
    @Transactional
    public void fillMissingDietPlans(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        log.info("检查并补齐用户 {} 的饮食计划 (今天: {}, 明天: {})", userId, today, tomorrow);

        // 检查并生成今天的计划
        List<DietPlan> todayPlans = dietPlanRepository
                .findByUserIdAndPlanDateOrderByMealTimeAsc(userId, today);
        if (todayPlans.isEmpty()) {
            generateDietPlanForDate(userId, today);
        }

        // 检查并生成明天的计划
        List<DietPlan> tomorrowPlans = dietPlanRepository
                .findByUserIdAndPlanDateOrderByMealTimeAsc(userId, tomorrow);
        if (tomorrowPlans.isEmpty()) {
            generateDietPlanForDate(userId, tomorrow);
        }
    }

    /**
     * 为新用户生成初始饮食计划（今天+明天）
     */
    @Transactional
    public void generateInitialDietPlans(Long userId) {
        LocalDate today = LocalDate.now();
        generateDietPlanForDate(userId, today);
        generateDietPlanForDate(userId, today.plusDays(1));
    }

    /**
     * 获取用户指定日期范围的饮食计划
     */
    public List<DietPlan> getDietPlans(Long userId, LocalDate startDate, LocalDate endDate) {
        // 先补齐可能缺失的计划
        fillMissingDietPlans(userId);
        return dietPlanRepository.findByUserIdAndPlanDateBetweenOrderByPlanDateAscMealTimeAsc(
                userId, startDate, endDate);
    }
}
