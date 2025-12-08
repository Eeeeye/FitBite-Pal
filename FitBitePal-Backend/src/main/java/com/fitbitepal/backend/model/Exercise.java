package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 运动库实体
 * 存储运动的详细信息，包括动图、视频等资源
 */
@Entity
@Table(name = "exercises")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Exercise {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;  // 运动名称（英文）
    
    @Column(length = 100)
    private String nameZh;  // 运动名称（中文）
    
    @Column(length = 50)
    private String category;  // 分类：cardio, strength, stretch, etc.
    
    @Column(length = 50)
    private String bodyPart;  // 锻炼部位：chest, back, legs, arms, core, etc.
    
    @Column(length = 50)
    private String equipment;  // 器械：bodyweight, dumbbell, barbell, etc.
    
    @Column(length = 50)
    private String difficulty;  // 难度：beginner, intermediate, advanced
    
    // ========== 媒体资源 ==========
    
    @Column(length = 500)
    private String gifUrl;  // GIF 动图 URL（运动演示）
    
    @Column(length = 500)
    private String videoUrl;  // 视频 URL（详细教学）
    
    @Column(length = 500)
    private String thumbnailUrl;  // 缩略图 URL
    
    // ========== 训练参数 ==========
    
    private Integer defaultSets;  // 默认组数
    
    private Integer defaultReps;  // 默认次数
    
    private Integer defaultDuration;  // 默认时长（秒）
    
    private Integer caloriesPerMinute;  // 每分钟消耗卡路里
    
    // ========== 详细说明 ==========
    
    @Column(columnDefinition = "TEXT")
    private String description;  // 运动说明
    
    @Column(columnDefinition = "TEXT")
    private String descriptionZh;  // 运动说明（中文）
    
    @Column(columnDefinition = "TEXT")
    private String instructions;  // 动作步骤（JSON数组）
    
    @Column(columnDefinition = "TEXT")
    private String instructionsZh;  // 动作步骤（中文，JSON数组）
    
    @Column(columnDefinition = "TEXT")
    private String tips;  // 注意事项
    
    @Column(columnDefinition = "TEXT")
    private String tipsZh;  // 注意事项（中文）
    
    // ========== 姿态识别配置 ==========
    
    @Column(columnDefinition = "TEXT")
    private String poseKeyPoints;  // 姿态关键点配置（JSON）
    
    @Column(columnDefinition = "TEXT")
    private String poseThresholds;  // 姿态判定阈值（JSON）
    
    // ========== 元数据 ==========
    
    private Boolean enabled = true;
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

