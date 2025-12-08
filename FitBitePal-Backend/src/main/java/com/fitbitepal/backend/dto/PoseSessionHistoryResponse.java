package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 姿态识别训练会话历史响应
 * 用于返回用户的训练会话列表
 * 
 * @author FitBitePal Team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoseSessionHistoryResponse {
    
    /**
     * 会话ID
     */
    private String sessionId;
    
    /**
     * 运动名称
     */
    private String exerciseName;
    
    /**
     * 训练日期
     */
    private LocalDateTime trainingDate;
    
    /**
     * 训练时长（秒）
     */
    private Integer duration;
    
    /**
     * 消耗卡路里
     */
    private Integer calories;
    
    /**
     * 完成组数
     */
    private Integer reps;
    
    /**
     * AI反馈日志（JSON字符串）
     */
    private String logs;
    
    /**
     * 训练视频URI
     */
    private String videoUri;
}

