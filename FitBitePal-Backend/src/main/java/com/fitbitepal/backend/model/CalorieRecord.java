package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "calorie_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CalorieRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false)
    private LocalDate recordDate;
    
    @Column(nullable = false)
    private Integer calorieIntake;  // 摄入
    
    @Column(nullable = false)
    private Integer calorieExpenditure;  // 消耗
    
    @Column
    private Integer baseMetabolism;  // 基础代谢率(BMR)，从用户资料计算得出
    
    @Column
    private Integer exerciseCalories;  // 运动消耗卡路里
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

