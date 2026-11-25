package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 完成记录实体 - 记录用户每天的运动和饮食完成情况
 */
@Entity
@Table(name = "completion_records", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"user_id", "record_date", "item_type", "item_index"}),
           @UniqueConstraint(name = "uk_completion_meal", columnNames = {"user_id", "record_date", "item_type", "meal_key"})
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CompletionRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;
    
    @Column(name = "item_type", nullable = false, length = 20)
    private String itemType;  // "exercise" 或 "meal"
    
    // Persisted only for exercises and legacy meals. Bound meals are unique by mealKey.
    @Column(name = "item_index")
    private Integer itemIndex;

    @Column(name = "meal_key", length = 40)
    private String mealKey;

    // The old mobile API reads the position in the current visible menu.
    @Transient
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Integer displayIndex;

    public Integer getItemIndex() {
        return displayIndex == null ? itemIndex : displayIndex;
    }
    
    @Column(nullable = false)
    private Boolean completed;  // 是否完成
    
    @Column(name = "item_name", length = 100)
    private String itemName;  // 项目名称（运动名或餐次名）
    
    @Column(name = "calories")
    private Integer calories;  // 卡路里（用于统计）
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

