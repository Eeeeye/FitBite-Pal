package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 姿态反馈响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoseFeedbackResponse {
    
    /**
     * 会话 ID
     */
    private String sessionId;
    
    /**
     * 帧序号
     */
    private Integer frameNumber;
    
    /**
     * 姿态评分 (0-100)
     */
    private Double score;
    
    /**
     * 整体状态: correct, needs_improvement, incorrect
     */
    private String overallStatus;
    
    /**
     * 纠正建议列表
     */
    private List<Correction> corrections;
    
    /**
     * 反馈时间
     */
    private LocalDateTime timestamp;
    
    /**
     * 单个纠正建议
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Correction {
        /**
         * 问题部位: back, knees, arms, etc.
         */
        private String bodyPart;
        
        /**
         * 问题类型: angle, alignment, position
         */
        private String issueType;
        
        /**
         * 纠正建议文本
         */
        private String message;
        
        /**
         * 严重程度: low, medium, high
         */
        private String severity;
    }
}


