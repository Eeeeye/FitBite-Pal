package com.fitbitepal.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * ModelScope AI 服务
 * 集成 Qwen3-VL-8B-Instruct 视觉多模态模型
 * 支持图像识别、食物分析、姿态识别等功能
 * 
 * @author FitBitePal Team
 */
@Slf4j
@Service
public class ModelScopeAIService {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${modelscope.api.base-url:https://api-inference.modelscope.cn/v1}")
    private String baseUrl;
    
    @Value("${modelscope.api.key:ms-de60e4e6-886e-4c3f-bcbb-b5c2f30c2b16}")
    private String apiKey;
    
    @Value("${modelscope.api.model:Qwen/Qwen3-VL-8B-Instruct}")
    private String model;
    
    @Value("${modelscope.api.enabled:true}")  // ✨ 修改默认值为 true，启用 AI
    private boolean enabled;
    
    public ModelScopeAIService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * 识别食物图片
     * 
     * @param imageUrl 图片 URL 或 base64 编码
     * @param prompt 可选的自定义提示词
     * @return AI 识别结果
     */
    public String recognizeFood(String imageUrl, String prompt) {
        if (!enabled) {
            log.warn("ModelScope AI 服务未启用");
            return null;
        }
        
        String foodPrompt = prompt != null ? prompt : 
            "请识别图片中的食物，并提供以下信息：\n" +
            "1. 食物名称\n" +
            "2. 估计的重量（克）\n" +
            "3. 大概的营养信息（卡路里、蛋白质、碳水化合物、脂肪）\n" +
            "请以 JSON 格式返回结果。";
        
        return sendVisionRequest(imageUrl, foodPrompt);
    }
    
    /**
     * 分析运动姿态
     * 
     * @param imageUrl 运动姿态图片 URL
     * @param exerciseName 运动名称
     * @param language 语言设置（zh=中文，en=英文）
     * @return 姿态分析结果和建议
     */
    public String analyzePose(String imageUrl, String exerciseName, String language) {
        log.info("🤖 [ModelScope AI] analyzePose 被调用 - enabled={}, exercise={}, language={}", enabled, exerciseName, language);
        
        if (!enabled) {
            log.warn("❌ [ModelScope AI] 服务未启用，返回 null");
            return null;
        }
        
        log.info("✅ [ModelScope AI] 服务已启用，准备发送视觉请求... language={}", language);
        
        // ✨ 根据语言构建不同的提示词
        String posePrompt;
        if ("zh".equals(language)) {
            // 中文提示词 - 优化评分标准，更加宽容
            posePrompt = String.format(
                "你是一位友好的健身教练。分析图片中的【%s】运动姿态，用中文回答。只返回JSON格式（使用英文字段名）：\n" +
                "{\n" +
                "  \"score\": 0-100分（数字）,\n" +
                "  \"isCorrect\": true或false（布尔值）,\n" +
                "  \"issues\": [\"问题1\", \"问题2\"]（中文数组，最多2个）,\n" +
                "  \"suggestions\": [\"建议1\", \"建议2\"]（中文数组，最多2个）\n" +
                "}\n" +
                "评分标准（重要）：\n" +
                "- 90-100分：动作标准，姿态完美\n" +
                "- 75-89分：动作基本正确，有小问题\n" +
                "- 60-74分：能看出在做【%s】，但姿态不够标准\n" +
                "- 40-59分：尝试在做相关动作，但偏差较大\n" +
                "- 20-39分：动作方向正确但执行很差\n" +
                "- 0-19分：完全没有做【%s】，或完全静止不动\n" +
                "请鼓励用户，即使动作不完美也要给予积极反馈。只有完全没做动作时才给低于20分。",
                exerciseName, exerciseName, exerciseName
            );
        } else {
            // 英文提示词 - 优化评分标准，更加宽容
            posePrompt = String.format(
                "You are a friendly fitness coach. Analyze the %s exercise pose. Return ONLY JSON with English keys:\n" +
                "{\n" +
                "  \"score\": 0-100,\n" +
                "  \"isCorrect\": true/false,\n" +
                "  \"issues\": [\"issue1\", \"issue2\"],\n" +
                "  \"suggestions\": [\"suggestion1\", \"suggestion2\"]\n" +
                "}\n" +
                "Scoring guidelines (important):\n" +
                "- 90-100: Perfect form and posture\n" +
                "- 75-89: Mostly correct with minor issues\n" +
                "- 60-74: Recognizable as %s but form needs work\n" +
                "- 40-59: Attempting the exercise but with significant deviations\n" +
                "- 20-39: Movement in right direction but poor execution\n" +
                "- 0-19: Not doing %s at all, or completely still\n" +
                "Be encouraging. Give positive feedback even if form isn't perfect. Only score below 20 if person isn't exercising at all.",
                exerciseName, exerciseName, exerciseName
            );
        }
        
        log.info("📝 AI提示词: {}", posePrompt.substring(0, Math.min(100, posePrompt.length())) + "...");
        
        return sendVisionRequest(imageUrl, posePrompt);
    }
    
    /**
     * 通用视觉问答
     * 
     * @param imageUrl 图片 URL
     * @param question 问题
     * @return AI 回答
     */
    public String askAboutImage(String imageUrl, String question) {
        if (!enabled) {
            log.warn("ModelScope AI 服务未启用");
            return null;
        }
        
        return sendVisionRequest(imageUrl, question);
    }
    
    /**
     * 发送视觉请求到 ModelScope API
     * 
     * @param imageUrl 图片 URL 或 base64
     * @param textPrompt 文本提示
     * @return AI 响应文本
     */
    private String sendVisionRequest(String imageUrl, String textPrompt) {
        try {
            // 构建请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("stream", false); // 非流式响应，便于解析
            
            // 构建消息内容
            List<Map<String, Object>> content = new ArrayList<>();
            
            // 添加文本内容
            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put("text", textPrompt);
            content.add(textContent);
            
            // 添加图片内容
            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("type", "image_url");
            Map<String, String> imageUrlMap = new HashMap<>();
            imageUrlMap.put("url", imageUrl);
            imageContent.put("image_url", imageUrlMap);
            content.add(imageContent);
            
            // 构建消息
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", content);
            
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(message);
            requestBody.put("messages", messages);
            
            // 设置请求头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            
            // 发送请求
            String url = baseUrl + "/chat/completions";
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            log.info("📤 发送 ModelScope 视觉请求: {}", url);
            log.info("📤 请求参数: model={}, prompt={}", model, textPrompt.substring(0, Math.min(50, textPrompt.length())) + "...");
            
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                String.class
            );
            
            log.info("📥 收到 ModelScope 响应: statusCode={}", response.getStatusCode());
            
            if (response.getStatusCode() == HttpStatus.OK) {
                // 解析响应
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                String aiResponse = jsonResponse
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();
                
                log.info("✅ ModelScope AI 响应成功: {}", aiResponse.substring(0, Math.min(200, aiResponse.length())) + "...");
                return aiResponse;
            } else {
                log.error("❌ ModelScope API 请求失败: statusCode={}, body={}", 
                         response.getStatusCode(), response.getBody());
                return null;
            }
            
        } catch (Exception e) {
            log.error("调用 ModelScope API 失败", e);
            return null;
        }
    }
    
    /**
     * 发送流式视觉请求（适用于长文本响应）
     * 
     * @param imageUrl 图片 URL
     * @param textPrompt 文本提示
     * @return 流式响应（需要进一步处理）
     */
    public String sendStreamingVisionRequest(String imageUrl, String textPrompt) {
        // TODO: 实现流式响应处理
        // 可以使用 WebClient 或 Spring WebFlux
        log.warn("流式响应暂未实现");
        return sendVisionRequest(imageUrl, textPrompt);
    }
    
    /**
     * 检查服务健康状态
     * 
     * @return 是否可用
     */
    public boolean isHealthy() {
        if (!enabled) {
            return false;
        }
        
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("ModelScope API Key 未配置");
            return false;
        }
        
        // TODO: 可以发送一个简单的测试请求来验证
        return true;
    }
    
    /**
     * 测试 API 连接
     * 
     * @return 测试结果
     */
    public boolean testConnection() {
        try {
            String testImageUrl = "https://modelscope.oss-cn-beijing.aliyuncs.com/demo/images/audrey_hepburn.jpg";
            String result = sendVisionRequest(testImageUrl, "描述这幅图");
            return result != null && !result.isEmpty();
        } catch (Exception e) {
            log.error("ModelScope API 连接测试失败", e);
            return false;
        }
    }
}

