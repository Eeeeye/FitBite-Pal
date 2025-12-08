package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.TrainingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TrainingRecordRepository extends JpaRepository<TrainingRecord, Long> {
    
    List<TrainingRecord> findByUserIdOrderByCompletedAtDesc(Long userId);
    
    List<TrainingRecord> findByUserIdAndCompletedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT SUM(r.caloriesBurned) FROM TrainingRecord r WHERE r.userId = ?1 AND r.completedAt BETWEEN ?2 AND ?3")
    Integer sumCaloriesByUserIdAndDateRange(Long userId, LocalDateTime start, LocalDateTime end);
}







