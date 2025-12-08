package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.MealSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealSetRepository extends JpaRepository<MealSet, Long> {
    
    // 按目标和餐次查找启用的套餐
    List<MealSet> findByGoalTypeAndMealTypeAndEnabledTrue(String goalType, String mealType);
    
    // 按餐次查找
    List<MealSet> findByMealTypeAndEnabledTrue(String mealType);
    
    // 按目标查找
    List<MealSet> findByGoalTypeAndEnabledTrue(String goalType);
    
    // 统计各目标类型的套餐数量
    long countByGoalTypeAndEnabledTrue(String goalType);
    
    // 查找所有启用的套餐
    List<MealSet> findByEnabledTrue();
    
    // 统计启用的套餐数量
    long countByEnabledTrue();
}

