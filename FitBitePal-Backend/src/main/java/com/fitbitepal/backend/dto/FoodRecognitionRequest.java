package com.fitbitepal.backend.dto;

import lombok.Data;

/**
 * 食物识别请求 DTO
 */
@Data
public class FoodRecognitionRequest {
    
    /**
     * Base64 编码的图片数据
     */
    private String imageBase64;
    
    /**
     * 图片 URL（可选，与 imageBase64 二选一）
     */
    private String imageUrl;
    
    /**
     * 用户 ID（用于记录和个性化建议）
     */
    private Long userId;
}


