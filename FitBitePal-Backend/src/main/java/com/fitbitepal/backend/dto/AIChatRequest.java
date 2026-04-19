package com.fitbitepal.backend.dto;

import lombok.Data;

/**
 * AI 对话请求 DTO
 */
@Data
public class AIChatRequest {

    /**
     * 文本消息
     */
    private String message;

    /**
     * Base64 编码图片
     */
    private String imageBase64;

    /**
     * 图片 URL
     */
    private String imageUrl;

    /**
     * 语言
     */
    private String language;

    /**
     * 用户 ID
     */
    private Long userId;
}
