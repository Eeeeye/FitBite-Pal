package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 饮食记录实体
 */
@Entity
@Table(name = "diet_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DietRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false, length = 100)
    private String foodName;
    
    @Column(length = 50)
    private String mealType;  // Breakfast, Lunch, Dinner, Snack
    
    private Integer calories;
    
    private Integer protein;  // g
    
    private Integer carbs;  // g
    
    private Integer fat;  // g
    
    @Column(length = 500)
    private String imageUrl;  // 食物照片URL
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime recordedAt;
}







