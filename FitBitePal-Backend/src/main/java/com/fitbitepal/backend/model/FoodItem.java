package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 食品库 - 存储食品的营养信息
 * 用于食物识别和热量估算
 */
@Entity
@Table(name = "food_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class FoodItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;  // 食品名称（中文）
    
    @Column(length = 100)
    private String nameEn;  // 食品名称（英文）
    
    @Column(length = 50)
    private String category;  // 分类：主食、蔬菜、水果、肉类、海鲜、饮品等
    
    // 每100g的营养成分
    private Integer calories;  // 卡路里 (kcal)
    
    private Double protein;  // 蛋白质 (g)
    
    private Double carbs;  // 碳水化合物 (g)
    
    private Double fat;  // 脂肪 (g)
    
    private Double fiber;  // 膳食纤维 (g)
    
    private Double sugar;  // 糖 (g)
    
    private Double sodium;  // 钠 (mg)
    
    // 常见份量
    @Column(length = 50)
    private String servingSize;  // 例如：1碗、1个、100g
    
    private Double servingWeight;  // 份量对应的重量(g)
    
    // 图片URL（用于识别匹配）
    @Column(length = 500)
    private String imageUrl;
    
    // AI识别关键词
    @Column(length = 500)
    private String keywords;  // 逗号分隔的关键词
    
    // 是否启用
    private Boolean enabled = true;
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}

