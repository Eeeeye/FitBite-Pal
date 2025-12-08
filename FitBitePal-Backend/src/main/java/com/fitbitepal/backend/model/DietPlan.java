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
@Table(name = "diet_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DietPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    // 计划日期
    private LocalDate planDate;
    
    // 菜名
    @Column(length = 100)
    private String mealName;
    
    @Column(nullable = false, length = 50)
    private String mealType;  // Breakfast, Lunch, Dinner, Snack
    
    @Column(nullable = false, length = 10)
    private String mealTime;  // e.g., "08:00"
    
    private Integer calories;
    
    @Column(length = 1000)
    private String foods;  // JSON array of food names (deprecated, use ingredients)
    
    @Column(length = 2000)
    private String ingredients;  // JSON array of {name, amount} objects
    
    private Integer protein;  // g
    
    private Integer carbs;  // g
    
    private Integer fat;  // g
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

