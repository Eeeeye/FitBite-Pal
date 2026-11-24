package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.DietPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Undated meals exposed by the legacy /plans/diet endpoint. */
@Service
@RequiredArgsConstructor
class LegacyDietTemplateService {
    private record Meal(String name, String time, String ingredients, double calorieShare,
                        double proteinShare, double carbShare, double fatShare) {}

    private static final List<Meal> MEALS = List.of(
            new Meal("Oatmeal Bowl", "08:00",
                    "[{\"name\":\"Oatmeal\",\"amount\":\"80g\"},{\"name\":\"Banana\",\"amount\":\"1 medium\"},{\"name\":\"Almond milk\",\"amount\":\"200ml\"},{\"name\":\"Honey\",\"amount\":\"10g\"}]", 0.30, 0.25, 0.50, 0.25),
            new Meal("Grilled Chicken Breast Salad", "12:30",
                    "[{\"name\":\"Chicken breast\",\"amount\":\"150g\"},{\"name\":\"Mixed vegetables\",\"amount\":\"100g\"},{\"name\":\"Olive oil\",\"amount\":\"5g\"},{\"name\":\"Quinoa\",\"amount\":\"50g\"}]", 0.40, 0.35, 0.40, 0.25),
            new Meal("Salmon with Vegetables", "18:30",
                    "[{\"name\":\"Salmon fillet\",\"amount\":\"180g\"},{\"name\":\"Broccoli\",\"amount\":\"150g\"},{\"name\":\"Sweet potato\",\"amount\":\"200g\"},{\"name\":\"Lemon juice\",\"amount\":\"15ml\"}]", 0.30, 0.35, 0.35, 0.30));

    private final DietPlanRepository plans;

    // Profile updates hold the parent user row lock until all templates are reconciled.
    void refresh(User user) {
        var remaining = new ArrayList<>(plans.findByUserIdAndPlanDateIsNullOrderByIdAsc(user.getId()));
        int target = user.getTargetCalories() == null ? 2000 : user.getTargetCalories();
        for (Meal meal : MEALS) {
            DietPlan plan = remaining.stream().filter(row -> meal.time().equals(row.getMealTime()))
                    .findFirst().orElseGet(DietPlan::new);
            remaining.remove(plan);
            int calories = (int) Math.round(target * meal.calorieShare());
            plan.setUserId(user.getId());
            plan.setMealType(meal.name());
            plan.setMealTime(meal.time());
            plan.setCalories(calories);
            plan.setIngredients(meal.ingredients());
            plan.setFoods("[]");
            plan.setProtein((int) (calories * meal.proteinShare() / 4));
            plan.setCarbs((int) (calories * meal.carbShare() / 4));
            plan.setFat((int) (calories * meal.fatShare() / 9));
            if (plan.getId() == null) plans.save(plan);
        }
        plans.deleteAll(remaining);
    }
}
