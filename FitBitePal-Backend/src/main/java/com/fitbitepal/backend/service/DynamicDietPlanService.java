package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.MealSet;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.MealSetRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import com.fitbitepal.backend.config.RedisConfig;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class DynamicDietPlanService {
    private final DietPlanRepository dietPlans;
    private final UserRepository users;
    private final MealSetRepository meals;
    private static final List<String> MEAL_TYPES = List.of("Breakfast", "Lunch", "Dinner");
    private static final List<String> MEAL_TIMES = List.of("08:00", "12:30", "18:30");

    @Cacheable(value = RedisConfig.CACHE_DIET_PLAN, key = "#userId + ':' + #date", unless = "#result.isEmpty()")
    @Transactional
    public List<DietPlan> generateDietPlanForDate(Long userId, LocalDate date) {
        return users.findForUpdate(userId).map(user -> ensurePlan(user, date)).orElseGet(List::of);
    }

    // The caller already holds the user's database row lock for the transaction.
    List<DietPlan> ensurePlan(User user, LocalDate date) {
        List<DietPlan> existing = dietPlans.findByUserIdAndPlanDateOrderByMealTimeAsc(user.getId(), date);
        if (!existing.isEmpty()) {
            return existing;
        }

        List<MealSet> enabled = meals.findByEnabledTrueOrderByIdAsc();
        String goal = user.getGoal() == null ? "Keep fit" : user.getGoal();
        Random random = new Random(date.hashCode() + user.getId().intValue());
        List<MealSet> selected = new ArrayList<>(MEAL_TYPES.size());
        for (String type : MEAL_TYPES) {
            List<MealSet> candidates = enabled.stream()
                    .filter(meal -> type.equals(meal.getMealType()))
                    .filter(meal -> meal.getCalories() != null && meal.getCalories() > 0)
                    .toList();
            if (candidates.isEmpty()) {
                return List.of();
            }
            List<MealSet> preferred = candidates.stream()
                    .filter(meal -> goal.equals(meal.getGoalType())).toList();
            List<MealSet> pool = preferred.isEmpty() ? candidates : preferred;
            selected.add(pool.get(random.nextInt(pool.size())));
        }

        double totalCalories = selected.stream().mapToDouble(MealSet::getCalories).sum();
        double ratio = (user.getTargetCalories() == null ? 2000 : user.getTargetCalories()) / totalCalories;
        List<DietPlan> result = new ArrayList<>(MEAL_TYPES.size());
        for (int i = 0; i < selected.size(); i++) {
            result.add(createDietPlanFromMealSet(user.getId(), date, MEAL_TYPES.get(i), MEAL_TIMES.get(i),
                    selected.get(i), ratio));
        }
        return dietPlans.saveAll(result);
    }

    private static int nutrient(Integer value) {
        return value == null ? 0 : value;
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
        plan.setProtein((int) Math.round(nutrient(mealSet.getProtein()) * calorieRatio));
        plan.setCarbs((int) Math.round(nutrient(mealSet.getCarbs()) * calorieRatio));
        plan.setFat((int) Math.round(nutrient(mealSet.getFat()) * calorieRatio));
        plan.setFoods("[]");
        return plan;
    }

}
