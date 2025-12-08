package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.CompletionRecord;
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
    List<CompletionRecord> findByRecordDateAndItemType(LocalDate recordDate, String itemType);
    
    /**
     * 删除用户的所有完成记录
     */
    void deleteByUserId(Long userId);
}

