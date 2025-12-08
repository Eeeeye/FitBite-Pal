package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.DietRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DietRecordRepository extends JpaRepository<DietRecord, Long> {
    
    List<DietRecord> findByUserIdOrderByRecordedAtDesc(Long userId);
    
    List<DietRecord> findByUserIdAndRecordedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT SUM(r.calories) FROM DietRecord r WHERE r.userId = ?1 AND r.recordedAt BETWEEN ?2 AND ?3")
    Integer sumCaloriesByUserIdAndDateRange(Long userId, LocalDateTime start, LocalDateTime end);
    
    // 删除指定时间之前的记录（用于清理历史数据）
    int deleteByRecordedAtBefore(LocalDateTime cutoffTime);
}







