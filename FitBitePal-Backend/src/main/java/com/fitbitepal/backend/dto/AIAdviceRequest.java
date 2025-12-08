package com.fitbitepal.backend.dto;

import lombok.Data;

/**
 * AI 建议请求 DTO
 */
@Data
public class AIAdviceRequest {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 问题类型: fitness, nutrition, general
     */
    private String questionType;
    
    /**
     * 用户的具体问题
     */
    private String question;
    
    /**
     * 上下文信息（可选）
     */
    private String context;
}


