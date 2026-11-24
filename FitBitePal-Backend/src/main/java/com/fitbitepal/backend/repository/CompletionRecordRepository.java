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
