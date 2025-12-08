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
@Table(name = "training_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TrainingPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false, length = 100)
    private String exerciseName;
    
    @Column(length = 50)
    private String duration;  // e.g., "30 min", "15 reps × 3"
    
    private Integer calories;
    
    @Column(length = 500)
    private String imageUrl;
    
    @Deprecated // 保留用于向后兼容，新代码使用 planDate
    private Integer dayOfWeek;  // 1-7 表示周一到周日
    
    @Column(name = "plan_date")
    private LocalDate planDate;  // 计划日期
    
    @Column(name = "source_check_in_id")
    private Long sourceCheckInId;  // 基于哪次打卡生成
    
    private Integer orderIndex;  // 排序
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

