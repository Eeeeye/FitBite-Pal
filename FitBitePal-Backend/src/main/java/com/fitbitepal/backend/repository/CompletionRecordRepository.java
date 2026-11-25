package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.CompletionRecord;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompletionRecordRepository extends JpaRepository<CompletionRecord, Long> {
    
    /**
     * 查找用户某天的所有完成记录
     */
    List<CompletionRecord> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);
    
    /**
     * 查找用户某天某类型的所有完成记录
     */
    List<CompletionRecord> findByUserIdAndRecordDateAndItemType(Long userId, LocalDate recordDate, String itemType);
    
    /**
     * 查找用户某天某类型某索引的完成记录
     */
    Optional<CompletionRecord> findByUserIdAndRecordDateAndItemTypeAndItemIndex(
            Long userId, LocalDate recordDate, String itemType, Integer itemIndex);
    
    @Modifying
    @Query("delete from CompletionRecord r where r.userId = :userId and r.mealKey = :mealKey")
    void deleteMeal(Long userId, String mealKey);

    Optional<CompletionRecord> findByUserIdAndRecordDateAndItemTypeAndMealKey(
            Long userId, LocalDate date, String type, String mealKey);

    /**
     * 查找用户某个日期范围的完成记录
     */
    List<CompletionRecord> findByUserIdAndRecordDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 删除用户某天的所有完成记录
     */
    void deleteByUserIdAndRecordDate(Long userId, LocalDate recordDate);
    
    /**
     * 获取用户某类型的所有历史完成记录（按日期倒序）
     */
    List<CompletionRecord> findByUserIdAndItemTypeOrderByRecordDateDesc(Long userId, String itemType);
    
    /**
     * 查找某天某类型的所有完成记录（管理后台统计用）
     */
    @Query("""
            select count(r) as total, coalesce(sum(case when r.completed = true then 1 else 0 end), 0) as completed
            from CompletionRecord r where r.recordDate = :date and r.itemType = :itemType
            """)
    CompletionTotals completionTotals(LocalDate date, String itemType);

    interface CompletionTotals {
        long getTotal();
        long getCompleted();
    }
    
    /**
     * 删除用户的所有完成记录
     */
    @Modifying
    @Query("delete from CompletionRecord r where r.userId = ?1")
    void deleteByUserId(Long userId);

    @Query("""
            select r.itemType as itemType, coalesce(sum(r.calories), 0) as total
            from CompletionRecord r where r.userId = :userId and r.recordDate = :date
            and r.completed = true and r.itemType in ('meal', 'exercise')
            group by r.itemType
            """)
    List<CalorieTotal> totalsForDay(Long userId, LocalDate date);

    @Query("""
            select r.recordDate as date,
                   coalesce(sum(case when r.itemType = 'meal' then r.calories else 0 end), 0) as intake,
                   coalesce(sum(case when r.itemType = 'exercise' then r.calories else 0 end), 0) as exercise
            from CompletionRecord r
            where r.userId = :userId and r.recordDate between :start and :end
              and r.completed = true and r.itemType in ('meal', 'exercise')
            group by r.recordDate
            """)
    List<DailyCalories> totalsByDate(Long userId, LocalDate start, LocalDate end);

    // Aggregate only the two requested windows, including unchecked meals for nutrition scores.
    @Query("""
            select r.recordDate as date,
                   coalesce(sum(case when r.itemType = 'meal' and r.completed = true then r.calories else 0 end), 0) as intake,
                   coalesce(sum(case when r.itemType = 'exercise' and r.completed = true then r.calories else 0 end), 0) as exercise,
                   sum(case when r.itemType = 'meal' then 1 else 0 end) as mealCount,
                   sum(case when r.itemType = 'meal' and r.completed = true then 1 else 0 end) as completedMeals
            from CompletionRecord r
            where r.userId = :userId and r.itemType in ('meal', 'exercise')
              and (r.recordDate between :serverStart and :serverEnd or r.recordDate between :clientStart and :clientEnd)
            group by r.recordDate
            """)
    List<DailyActivity> activityByDate(Long userId, LocalDate serverStart, LocalDate serverEnd,
                                       LocalDate clientStart, LocalDate clientEnd);

    interface DailyActivity extends DailyCalories {
        long getMealCount();
        long getCompletedMeals();
    }

    // Old clients use the current plan-time order followed by manual record ID order.
    // Keep unmappable historical rows out of the current menu's positional namespace.
    @Query(value = """
            select c.id as recordId, c.meal_key as mealKey, c.completed as completed,
                case when p.id is not null then (
                    select count(*) from diet_plans prior where prior.user_id = c.user_id
                    and prior.plan_date = c.record_date and prior.hidden = false
                    and (prior.meal_time < p.meal_time or (prior.meal_time = p.meal_time and prior.id < p.id)))
                when d.id is not null then (
                    select count(*) from diet_plans other where other.user_id = c.user_id
                    and other.plan_date = c.record_date and other.hidden = false) + (
                    select count(*) from diet_records prior where prior.user_id = c.user_id
                    and prior.recorded_at >= c.record_date and prior.recorded_at < timestampadd(day, 1, c.record_date) and prior.id < d.id)
                when c.meal_key is null and not exists (
                    select 1 from diet_plans other where other.user_id = c.user_id
                    and other.plan_date = c.record_date and other.hidden = false) and not exists (
                    select 1 from diet_records other where other.user_id = c.user_id
                    and other.recorded_at >= c.record_date and other.recorded_at < timestampadd(day, 1, c.record_date)) then c.item_index end as itemIndex
            from completion_records c
            left join diet_plans p on p.user_id = c.user_id and p.plan_date = c.record_date and p.hidden = false
                and c.meal_key = concat('plan:', p.id)
            left join diet_records d on d.user_id = c.user_id and d.recorded_at >= c.record_date and d.recorded_at < timestampadd(day, 1, c.record_date)
                and c.meal_key = concat('record:', d.id)
            where c.user_id = :userId and c.item_type = 'meal' and (:date is null or c.record_date = :date)
            """, nativeQuery = true)
    List<MealFlag> mealFlags(Long userId, LocalDate date);

    interface MealFlag {
        Long getRecordId();
        String getMealKey();
        Integer getItemIndex();
        boolean getCompleted();
    }

    interface DailyCalories {
        LocalDate getDate();
        long getIntake();
        long getExercise();
    }

    interface CalorieTotal {
        String getItemType();
        long getTotal();
    }

    void deleteByUserIdAndRecordDateAndItemType(Long userId, LocalDate date, String itemType);

    List<CompletionRecord> findByUserIdAndItemTypeAndRecordDateBetweenOrderByRecordDateDesc(Long userId, String type, LocalDate start, LocalDate end);
}
