package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.CheckInRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 打卡记录 Repository
 */
@Repository
public interface CheckInRecordRepository extends JpaRepository<CheckInRecord, Long> {
    
    /**
     * 查找指定用户指定日期的打卡记录
     */
    Optional<CheckInRecord> findByUserIdAndCheckInDate(Long userId, LocalDate date);
    
    /**
     * 查找用户的所有打卡记录，按日期倒序
     */
    List<CheckInRecord> findByUserIdOrderByCheckInDateDesc(Long userId);
    
    /**
     * 查找用户在指定日期范围内的打卡记录
     */
    List<CheckInRecord> findByUserIdAndCheckInDateBetween(Long userId, LocalDate start, LocalDate end);
    
    /**
     * 查找用户在指定日期范围内的打卡记录，按日期升序
     */
    List<CheckInRecord> findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(Long userId, LocalDate start, LocalDate end);
    
    /**
     * 查找用户在指定日期之前的最近一次打卡
     */
    Optional<CheckInRecord> findFirstByUserIdAndCheckInDateLessThanEqualOrderByCheckInDateDesc(Long userId, LocalDate date);
    
    /**
     * 统计指定日期的打卡数量
     */
    long countByCheckInDate(LocalDate date);
    
    /**
     * 删除用户的所有打卡记录
     */
    void deleteByUserId(Long userId);
}

