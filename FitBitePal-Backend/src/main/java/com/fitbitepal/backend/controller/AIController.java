package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.AIService;
import com.fitbitepal.backend.service.ModelScopeAIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AI 功能控制器
 * 提供食物识别和 AI 建议功能
 * 
 * @author FitBitePal Team
 */
@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AIController {
    
    private final AIService aiService;
    private final ModelScopeAIService modelScopeAIService;
    
    /**
     * 识别食物图片
     * POST /api/ai/food/recognize (实际路径)
     * 
     * @param request 食物识别请求（包含图片 base64 或 URL）
     * @return 识别结果，包含食物名称、营养信息等
     */
    @PostMapping("/food/recognize")
    public ResponseEntity<ApiResponse<FoodRecognitionResponse>> recognizeFood(
            @RequestBody FoodRecognitionRequest request) {
        log.info("收到食物识别请求: userId={}", request.getUserId());
        
        try {
            FoodRecognitionResponse response = aiService.recognizeFood(request);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("食物识别失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "食物识别失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取 AI 健身/营养建议
     * POST /api/ai/advice (实际路径)
     * 
     * @param request AI 建议请求
     * @return AI 生成的个性化建议
     */
    @PostMapping("/advice")
    public ResponseEntity<ApiResponse<AIAdviceResponse>> getAdvice(
            @RequestBody AIAdviceRequest request) {
        log.info("收到 AI 建议请求: userId={}, type={}", 
                request.getUserId(), request.getQuestionType());
        
        try {
            AIAdviceResponse response = aiService.getAdvice(request);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("AI 建议生成失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "AI 建议生成失败: " + e.getMessage()));
        }
    }
    
    /**
     * 健康检查端点
     * GET /api/ai/health (实际路径)
     * 
     * @return AI 服务状态
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        boolean healthy = aiService.isHealthy();
        if (healthy) {
            return ResponseEntity.ok(ApiResponse.success("AI 服务运行正常"));
        } else {
            return ResponseEntity.ok(ApiResponse.error(503, "AI 服务不可用"));
        }
    }
    
    /**
     * 测试 ModelScope AI 连接
     * GET /api/ai/test (实际路径)
     * 
     * @return 测试结果
     */
    @GetMapping("/test")
    public ResponseEntity<ApiResponse<String>> testModelScope() {
        log.info("测试 ModelScope AI 连接");
        
        try {
            boolean connected = modelScopeAIService.testConnection();
            if (connected) {
                return ResponseEntity.ok(ApiResponse.success("ModelScope AI 连接成功！"));
            } else {
                return ResponseEntity.ok(ApiResponse.error(503, "ModelScope AI 连接失败"));
            }
        } catch (Exception e) {
            log.error("ModelScope AI 测试失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "测试失败: " + e.getMessage()));
        }
    }
}

