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
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "record_date", "item_type", "item_index"}))
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
    
    @Column(name = "item_index", nullable = false)
    private Integer itemIndex;  // 项目在列表中的索引
    
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

