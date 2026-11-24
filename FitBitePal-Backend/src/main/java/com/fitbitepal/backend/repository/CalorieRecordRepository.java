package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.CalorieRecord;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CalorieRecordRepository extends JpaRepository<CalorieRecord, Long> {
    
    List<CalorieRecord> findByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
            Long userId, LocalDate startDate, LocalDate endDate);
    
    Optional<CalorieRecord> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);
    
    boolean existsByUserIdAndRecordDate(Long userId, LocalDate date);

    Optional<CalorieRecord> findFirstByUserIdAndRecordDateOrderByIdDesc(Long userId, LocalDate date);

    List<CalorieRecord> findTop7ByUserIdOrderByRecordDateDesc(Long userId);
    
    /**
     * 删除用户的所有卡路里记录
     */
    @Modifying
    @Query("delete from CalorieRecord r where r.userId = ?1")
    void deleteByUserId(Long userId);
}

