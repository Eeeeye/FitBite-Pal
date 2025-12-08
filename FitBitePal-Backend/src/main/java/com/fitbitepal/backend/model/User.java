package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
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

