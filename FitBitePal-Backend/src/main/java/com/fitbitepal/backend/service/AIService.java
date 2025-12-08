package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AI 服务
 * 负责食物识别和 AI 建议功能
 * 
 * TODO: 集成真实的 AI 模型（ModelScope/OpenAI）
 * 当前使用 Mock 实现用于开发和测试
 * 
 * @author FitBitePal Team
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AIService {
    
    private final UserRepository userRepository;
    private final ModelScopeAIService modelScopeAIService;
    
    @Value("${app.ai.enabled:false}")
    private boolean aiEnabled;
    
    @Value("${modelscope.api.enabled:false}")
    private boolean modelScopeEnabled;
    
    /**
     * 识别食物
     * 
     * @param request 包含图片数据的请求
     * @return 食物识别结果
     */
    public FoodRecognitionResponse recognizeFood(FoodRecognitionRequest request) {
        log.info("开始识别食物: userId={}", request.getUserId());
        
        // 如果启用了 ModelScope AI，使用真实的 AI 识别
        if (modelScopeEnabled && modelScopeAIService.isHealthy()) {
            try {
                String imageUrl = request.getImageUrl() != null ? 
                    request.getImageUrl() : request.getImageBase64();
                
                String aiResult = modelScopeAIService.recognizeFood(imageUrl, null);
                
                if (aiResult != null && !aiResult.isEmpty()) {
                    log.info("ModelScope AI 识别成功");
                    // TODO: 解析 AI 返回的 JSON 并转换为 FoodRecognitionResponse
                    // 目前先返回 Mock 数据，后续实现 JSON 解析
            return createMockFoodRecognition();
        }
            } catch (Exception e) {
                log.error("ModelScope AI 识别失败，降级到 Mock 数据", e);
            }
        }
        
        // 降级方案：返回 Mock 数据
        log.warn("使用 Mock 数据");
        return createMockFoodRecognition();
    }
    
    /**
     * 获取 AI 健身/营养建议
     * 
     * @param request AI 建议请求
     * @return AI 生成的建议
     */
    public AIAdviceResponse getAdvice(AIAdviceRequest request) {
        log.info("生成 AI 建议: userId={}, type={}", 
                request.getUserId(), request.getQuestionType());
        
        // 获取用户信息用于个性化建议
        boolean personalized = false;
        if (request.getUserId() != null) {
            userRepository.findById(request.getUserId()).ifPresent(user -> {
                log.info("为用户 {} 生成个性化建议", user.getEmail());
            });
            personalized = true;
        }
        
        // TODO: 集成 ModelScope AI 生成个性化建议
        // 当前返回 Mock 数据
        log.warn("AI 建议功能暂使用 Mock 数据");
        return createMockAdvice(request.getQuestionType(), personalized);
    }
    
    /**
     * 检查 AI 服务健康状态
     * 
     * @return 是否健康
     */
    public boolean isHealthy() {
        if (!modelScopeEnabled) {
            log.debug("ModelScope AI 服务未启用");
            return false;
        }
        
        return modelScopeAIService.isHealthy();
    }
    
    // ==================== Mock 数据方法（开发阶段使用）====================
    
    private FoodRecognitionResponse createMockFoodRecognition() {
        FoodRecognitionResponse.NutritionInfo nutrition1 = FoodRecognitionResponse.NutritionInfo.builder()
                .calories(250.0)
                .protein(30.0)
                .carbs(5.0)
                .fat(12.0)
                .build();
        
        FoodRecognitionResponse.NutritionInfo nutrition2 = FoodRecognitionResponse.NutritionInfo.builder()
                .calories(150.0)
                .protein(3.0)
                .carbs(30.0)
                .fat(2.0)
                .build();
        
        FoodRecognitionResponse.FoodItem food1 = FoodRecognitionResponse.FoodItem.builder()
                .name("烤鸡胸肉")
                .confidence(0.92)
                .estimatedWeight(150.0)
                .nutrition(nutrition1)
                .build();
        
        FoodRecognitionResponse.FoodItem food2 = FoodRecognitionResponse.FoodItem.builder()
                .name("糙米饭")
                .confidence(0.88)
                .estimatedWeight(120.0)
                .nutrition(nutrition2)
                .build();
        
        List<FoodRecognitionResponse.FoodItem> foods = new ArrayList<>();
        foods.add(food1);
        foods.add(food2);
        
        FoodRecognitionResponse.NutritionInfo totalNutrition = FoodRecognitionResponse.NutritionInfo.builder()
                .calories(400.0)
                .protein(33.0)
                .carbs(35.0)
                .fat(14.0)
                .build();
        
        return FoodRecognitionResponse.builder()
                .foods(foods)
                .totalNutrition(totalNutrition)
                .build();
    }
    
    private AIAdviceResponse createMockAdvice(String questionType, boolean personalized) {
        String advice;
        
        switch (questionType) {
            case "fitness":
                advice = "根据您的健身目标，建议每周进行 4-5 次力量训练，每次 45-60 分钟。" +
                        "注意循序渐进，避免过度训练导致受伤。训练后要保证充足的休息和睡眠。";
                break;
            case "nutrition":
                advice = "建议采用高蛋白、适量碳水、低脂的饮食结构。每日摄入蛋白质约 1.6-2.0g/kg 体重，" +
                        "碳水化合物 3-4g/kg 体重。多吃新鲜蔬菜水果，保持水分充足。";
                break;
            default:
                advice = "保持健康的生活方式很重要。建议规律作息，均衡饮食，适量运动，" +
                        "保持良好的心理状态。如有特殊需求，请咨询专业的健身教练或营养师。";
        }
        
        return AIAdviceResponse.builder()
                .advice(advice)
                .type(questionType)
                .confidence(0.85)
                .timestamp(LocalDateTime.now())
                .personalized(personalized)
                .build();
    }
}

