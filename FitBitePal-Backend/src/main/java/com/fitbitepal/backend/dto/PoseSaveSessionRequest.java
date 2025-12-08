package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 保存姿态识别训练会话请求
 * 
 * @author FitBitePal Team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoseSaveSessionRequest {
    
    /**
     * 会话ID
     */
    private String sessionId;
    
    /**
     * 用户ID
     */
    private Long userId;
    
    /**
     * 运动名称
     */
    private String exerciseName;
    
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

