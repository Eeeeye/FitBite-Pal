package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 系统配置 - 存储系统级配置参数
 * 包括AI模型阈值、业务规则等
 */
@Entity
@Table(name = "system_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SystemConfig {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 100)
    private String configKey;  // 配置键
    
    @Column(length = 1000)
    private String configValue;  // 配置值
    
    @Column(length = 50)
    private String configType;  // 配置类型：STRING, INTEGER, DOUBLE, BOOLEAN, JSON
    
    @Column(length = 50)
    private String category;  // 分类：AI_MODEL, BUSINESS_RULE, SYSTEM
    
    @Column(length = 500)
    private String description;  // 配置描述
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // 常用配置键常量
    public static final String POSE_CONFIDENCE_THRESHOLD = "pose.confidence.threshold";
    public static final String FOOD_RECOGNITION_THRESHOLD = "food.recognition.threshold";
    public static final String MAX_TRAINING_DURATION = "training.max.duration";
    public static final String MIN_TRAINING_DURATION = "training.min.duration";
    public static final String DEFAULT_CALORIES_PER_EXERCISE = "exercise.default.calories";
}

