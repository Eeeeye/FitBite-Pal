package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.CheckInRecord;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
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
    @Modifying
    @Query("delete from CheckInRecord r where r.userId = ?1")
    void deleteByUserId(Long userId);

    @Query("select c.checkInDate from CheckInRecord c where c.userId = ?1 order by c.checkInDate desc")
    List<LocalDate> datesDescending(Long userId);

    @Query("select c.checkInDate from CheckInRecord c where c.userId = ?1 and c.checkInDate between ?2 and ?3 order by c.checkInDate")
    List<LocalDate> datesBetween(Long userId, LocalDate start, LocalDate end);

    List<CheckInRecord> findTop10ByUserIdOrderByCheckInDateDesc(Long userId);

    @Query("""
            select new com.fitbitepal.backend.dto.DailyCount(c.checkInDate, count(distinct c.userId))
            from CheckInRecord c where c.checkInDate between ?1 and ?2 group by c.checkInDate
            """)
    List<com.fitbitepal.backend.dto.DailyCount> dailyActiveUsers(LocalDate start, LocalDate end);
}
