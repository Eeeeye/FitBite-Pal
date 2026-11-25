package com.fitbitepal.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.ToString;
import org.hibernate.annotations.DynamicUpdate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@DynamicUpdate
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(length = 20)
    private String phone;  // 电话号码
    
    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @ToString.Exclude
    private String password;
    
    // 角色：USER（普通用户）, ADMIN（管理员）
    @Column(length = 20)
    private String role = "USER";
    
    // 基本信息
    @Column(length = 10)
    private String gender;  // Male, Female
    
    private Integer age;
    
    private Double height;  // cm
    
    private Double weight;  // kg

    private Double goalWeight;  // kg

    private Double goalBodyFatRate;  // %

    private Double goalWeightStart;
    private Double goalBodyFatStart;

    public void setGoalWeight(Double target) {
        if (!java.util.Objects.equals(goalWeight, target)) {
            goalWeightStart = target == null ? null : positiveMeasurement(weight);
        }
        goalWeight = target;
    }

    public void setGoalBodyFatRate(Double target) {
        if (!java.util.Objects.equals(goalBodyFatRate, target)) {
            goalBodyFatStart = target == null ? null : positiveMeasurement(bodyFatRate);
        }
        goalBodyFatRate = target;
    }

    // A goal may be set before onboarding or before the first body-fat estimate.
    @PrePersist
    @PreUpdate
    public void capturePendingGoalMeasurements() {
        if (goalWeight != null && goalWeight > 0 && goalWeightStart == null) {
            goalWeightStart = positiveMeasurement(weight);
        }
        if (goalBodyFatRate != null && goalBodyFatRate > 0 && goalBodyFatStart == null) {
            goalBodyFatStart = positiveMeasurement(bodyFatRate);
        }
    }

    private static Double positiveMeasurement(Double value) {
        return value != null && Double.isFinite(value) && value > 0 ? value : null;
    }
    
    @Column(length = 50)
    private String goal;  // Lose weight, Get fitter, Gain more flexible
    
    @Column(length = 50)
    private String activityLevel;  // Beginner, Intermediate, Advanced
    
    private Integer trainingDuration;  // minutes
    
    @Column(length = 50)
    private String trainingArea;  // Full body, Upper body, Lower body, Core
    
    @Column(length = 50)
    private String trainingIntensity;  // Rookie, Beginner, Intermediate, Advanced
    
    // AI计算结果
    private Double bmi;
    
    private Double bodyFatRate;
    
    private Integer bmr;  // 基础代谢率
    
    private Integer tdee;  // 总消耗
    
    private Integer targetCalories;
    
    private Integer recommendedProtein;  // g
    
    private Integer recommendedCarbs;  // g
    
    private Integer recommendedFat;  // g
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}

