package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.DietRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DietRecordRepository extends JpaRepository<DietRecord, Long> {
    
    @Modifying
    @Query("delete from DietRecord r where r.userId = ?1")
    void deleteByUserId(Long userId);

    List<DietRecord> findByUserIdOrderByRecordedAtDesc(Long userId);
    
    @Query("select d from DietRecord d where d.userId = ?1 and d.recordedAt between ?2 and ?3 order by d.id")
    List<DietRecord> findByUserIdAndRecordedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT SUM(r.calories) FROM DietRecord r WHERE r.userId = ?1 AND r.recordedAt BETWEEN ?2 AND ?3")
    Integer sumCaloriesByUserIdAndDateRange(Long userId, LocalDateTime start, LocalDateTime end);
    
    @Modifying
    @Query("delete from DietRecord d where d.id = :id and (:admin = true or d.userId = :owner)")
    int deleteForActor(@Param("id") Long id,
                       @Param("owner") Long owner,
                       @Param("admin") boolean admin);
}
