package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 姿态识别会话响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoseSessionResponse {
    
    /**
     * 会话 ID
     */
    private String sessionId;
    
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
    
    /**
     * 会话开始时间
     */
    private LocalDateTime startTime;
    
    /**
     * 会话状态: active, completed, aborted
     */
    private String status;
}


