package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 食物识别响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodRecognitionResponse {
    
    /**
     * 识别结果列表
     */
    private List<FoodItem> foods;
    
    /**
     * 总营养信息
     */
    private NutritionInfo totalNutrition;
    
    /**
     * 单个食物项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FoodItem {
        /**
         * 食物名称
         */
        private String name;
        
        /**
         * 置信度 (0-1)
         */
        private Double confidence;
        
        /**
         * 估计重量（克）
         */
        private Double estimatedWeight;
        
        /**
         * 营养信息
         */
        private NutritionInfo nutrition;
    }
    
    /**
     * 营养信息
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NutritionInfo {
        /**
         * 卡路里 (kcal)
         */
        private Double calories;
        
        /**
         * 蛋白质 (g)
         */
        private Double protein;
        
        /**
         * 碳水化合物 (g)
         */
        private Double carbs;
        
        /**
         * 脂肪 (g)
         */
        private Double fat;
    }
}


