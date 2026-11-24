package com.fitbitepal.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 姿态识别训练会话实体
 * 记录用户的每次AI姿态训练记录
 * 
 * @author FitBitePal Team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pose_sessions", indexes = @Index(name = "idx_pose_draft_age", columnList = "session_state,created_at"))
public class PoseSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 会话ID（UUID）
     */
    @Column(name = "session_id", unique = true, nullable = false, length = 36)
    private String sessionId;
    
    /**
     * 用户ID
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    /**
     * 运动名称
     */
    @Column(name = "exercise_name", nullable = false, length = 100)
    private String exerciseName;

    @Column(name = "exercise_id")
    private Long exerciseId;

    public enum State { ACTIVE, COMPLETED, ABORTED, SAVED }

    // Rows written before V8 are already-saved history.
    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(name = "session_state", length = 16)
    private State state;

    public boolean isSaved() {
        return state == null || state == State.SAVED;
    }
    
    /**
     * 训练时长（秒）
     */
    @Column(name = "duration")
    private Integer duration;
    
    /**
     * 消耗卡路里
     */
    @Column(name = "calories")
    private Integer calories;
    
    /**
     * 完成组数
     */
    @Column(name = "reps")
    private Integer reps;
    
    /**
     * AI反馈日志（JSON格式）
     */
    @Column(name = "logs", columnDefinition = "TEXT")
    private String logs;
    
    /**
     * 训练视频URI
     */
    @Column(name = "video_uri", columnDefinition = "TEXT")
    private String videoUri;
    
    /**
     * 训练日期
     */
    @Column(name = "training_date", nullable = false)
    private LocalDateTime trainingDate;
    
    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (trainingDate == null) {
            trainingDate = LocalDateTime.now();
        }
    }
}

