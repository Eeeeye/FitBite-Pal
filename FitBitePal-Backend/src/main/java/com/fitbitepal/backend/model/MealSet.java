package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 套餐/组合菜品 - 存储预设的餐食组合
 * 用于饮食推荐系统
 */
@Entity
@Table(name = "meal_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class MealSet {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;  // 套餐名称（中文），如"燕麦粥配蓝莓"
    
    @Column(length = 100)
    private String nameEn;  // 套餐名称（英文），如"Oatmeal with Blueberries"
    
    @Column(length = 50)
    private String mealType;  // 餐次类型：Breakfast, Lunch, Dinner
    
    @Column(length = 50)
    private String goalType;  // 适用目标：Lose weight, Build muscle, Keep fit
    
    @Column(length = 2000)
    private String ingredients;  // 食材JSON（中文），如 [{"name":"燕麦","amount":"50g"},...]
    
    @Column(length = 2000)
    private String ingredientsEn;  // 食材JSON（英文），如 [{"name":"Oatmeal","amount":"50g"},...]
    
    // 营养成分
    private Integer calories;
    private Integer protein;
    private Integer carbs;
    private Integer fat;
    
    // 是否启用
    private Boolean enabled = true;
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

