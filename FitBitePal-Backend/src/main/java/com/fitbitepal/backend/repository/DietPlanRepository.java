package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.DietPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DietPlanRepository extends JpaRepository<DietPlan, Long> {
    
    Optional<DietPlan> findByUserId(Long userId);
    
    List<DietPlan> findByUserIdOrderByMealTimeAsc(Long userId);
    
    // 按日期查询饮食计划
    List<DietPlan> findByUserIdAndPlanDateOrderByMealTimeAsc(Long userId, LocalDate planDate);
    
    // 按日期范围查询
    List<DietPlan> findByUserIdAndPlanDateBetweenOrderByPlanDateAscMealTimeAsc(
            Long userId, LocalDate startDate, LocalDate endDate);
    
    // 删除指定日期的计划
    void deleteByUserIdAndPlanDate(Long userId, LocalDate planDate);
    
    void deleteByUserId(Long userId);
}

