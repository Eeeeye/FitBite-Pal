package com.fitbitepal.backend.dto;

import lombok.Data;

/**
 * 姿态识别会话请求 DTO
 */
@Data
public class PoseSessionRequest {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 运动类型 ID
     */
    private Long exerciseId;
    
    /**
     * 运动名称
     */
    private String exerciseName;
}


