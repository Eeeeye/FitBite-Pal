package com.fitbitepal.backend.dto;

import lombok.Data;

import java.util.List;

/**
 * 姿态帧数据请求 DTO
 */
@Data
public class PoseFrameRequest {
    
    /**
     * 会话 ID
     */
    private String sessionId;
    
    /**
     * 帧序号
     */
    private Integer frameNumber;
    
    /**
     * 时间戳（毫秒）
     */
    private Long timestamp;
    
    /**
     * 关键点数据（可以是图片 base64 或已提取的关键点坐标）
     */
    private String imageBase64;
    
    /**
     * 已提取的关键点（可选，如果客户端已经做了姿态检测）
     */
    private List<Keypoint> keypoints;
    
    /**
     * 运动名称（用于AI分析）
     */
    private String exerciseName;
    
    /**
     * 语言设置（zh=中文，en=英文）
     */
    private String language;
    
    /**
     * 关键点数据结构
     */
    @Data
    public static class Keypoint {
        /**
         * 关键点名称: nose, left_eye, right_eye, etc.
         */
        private String name;
        
        /**
         * X 坐标（归一化 0-1）
         */
        private Double x;
        
        /**
         * Y 坐标（归一化 0-1）
         */
        private Double y;
        
        /**
         * 置信度 (0-1)
         */
        private Double confidence;
    }
}


