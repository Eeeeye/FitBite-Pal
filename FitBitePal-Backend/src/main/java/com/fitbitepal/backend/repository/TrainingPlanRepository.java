package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.TrainingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {
    
    Optional<TrainingPlan> findByUserId(Long userId);
    
    // 旧方法 - 基于星期几查询（向后兼容）
    @Deprecated
    List<TrainingPlan> findByUserIdOrderByDayOfWeekAscOrderIndexAsc(Long userId);
    
    @Deprecated
    List<TrainingPlan> findByUserIdAndDayOfWeekOrderByOrderIndexAsc(Long userId, Integer dayOfWeek);
    
    void deleteByUserId(Long userId);
    
    // 新方法 - 基于日期查询
    /**
     * 查找指定用户指定日期的训练计划
     */
    List<TrainingPlan> findByUserIdAndPlanDateOrderByOrderIndexAsc(Long userId, LocalDate planDate);
    
    /**
     * 查找指定用户在指定日期范围内的训练计划
     */
    List<TrainingPlan> findByUserIdAndPlanDateBetweenOrderByPlanDateAscOrderIndexAsc(
            Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 删除指定用户指定日期及之后的训练计划
     */
    void deleteByUserIdAndPlanDateGreaterThanEqual(Long userId, LocalDate planDate);
    
    /**
     * 删除指定用户指定日期的训练计划
     */
    void deleteByUserIdAndPlanDate(Long userId, LocalDate planDate);
}

