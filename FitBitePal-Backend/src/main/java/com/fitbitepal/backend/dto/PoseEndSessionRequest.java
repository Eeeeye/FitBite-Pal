package com.fitbitepal.backend.dto;

import lombok.Data;

/**
 * 结束姿态识别会话请求 DTO
 */
@Data
public class PoseEndSessionRequest {
    
    /**
     * 会话 ID
     */
    private String sessionId;
    
    /**
     * 完成的重复次数
     */
    private Integer completedReps;
    
    /**
     * 总时长（秒）
     */
    private Integer durationSeconds;
    
    /**
     * 会话状态: completed, aborted
     */
    private String status;
}


