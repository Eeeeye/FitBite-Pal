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
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.Positive
    private Long userId;
    
    /**
     * 运动类型 ID
     */
    private Long exerciseId;
    
    /**
     * 运动名称
     */
    @jakarta.validation.constraints.Size(max = 100)
    private String exerciseName;
}


