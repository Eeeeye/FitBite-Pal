package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 打卡记录实体
 * 记录用户打卡日期和当时的身体数据（用于历史数据统计和折线图）
 */
@Entity
@Table(name = "check_in_records", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "check_in_date"}))
@Data
public class CheckInRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;
    
    // ✅ 新增：记录打卡时的体重（用于历史数据统计）
    @Column(name = "weight")
    private Double weight;
    
    // ✅ 新增：记录打卡时的身高（用于历史数据统计）
    @Column(name = "height")
    private Double height;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

