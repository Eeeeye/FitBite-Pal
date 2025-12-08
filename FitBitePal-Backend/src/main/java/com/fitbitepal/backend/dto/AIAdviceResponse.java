package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AI 建议响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIAdviceResponse {
    
    /**
     * AI 生成的建议文本
     */
    private String advice;
    
    /**
     * 建议类型
     */
    private String type;
    
    /**
     * 置信度 (0-1)
     */
    private Double confidence;
    
    /**
     * 生成时间
     */
    private LocalDateTime timestamp;
    
    /**
     * 是否基于用户个人数据
     */
    private Boolean personalized;
}


