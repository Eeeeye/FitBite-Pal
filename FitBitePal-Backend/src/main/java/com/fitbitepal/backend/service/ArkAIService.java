package com.fitbitepal.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.dto.FoodRecognitionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 火山方舟 AI 服务
 * 使用 OpenAI 兼容的 Chat Completions 接口承载文本与视觉能力。
 */
@Slf4j
@Service
public class ArkAIService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ark.api.base-url:https://ark.cn-beijing.volces.com/api/coding/v3}")
    private String baseUrl;

    @Value("${ark.api.key:}")
    private String apiKey;

    @Value("${ark.api.model:doubao-seed-2.0-pro}")
    private String model;

    @Value("${ark.api.enabled:true}")
    private boolean enabled;

    @Value("${app.ai.ark.timeout:30000}")
    private int timeoutMs;

    public ArkAIService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public FoodRecognitionResponse recognizeFood(String imageInput, String language) {
        if (!isHealthy()) {
            log.warn("Ark AI 服务不可用，跳过食物识别");
            return null;
        }

        if (imageInput == null || imageInput.isBlank()) {
            log.warn("Ark 食物识别缺少图片输入");
            return null;
        }

        String prompt = buildFoodRecognitionPrompt(language);
        String aiResponse = sendVisionRequest(imageInput, prompt);
        if (aiResponse == null || aiResponse.isBlank()) {
            return null;
        }

        return parseFoodRecognition(aiResponse);
    }

    public String analyzePose(String imageInput, String exerciseName, String language) {
        if (!isHealthy()) {
            log.warn("Ark AI 服务不可用，跳过姿态分析");
            return null;
        }

        String posePrompt = buildPosePrompt(exerciseName, language);
        return sendVisionRequest(imageInput, posePrompt);
    }

    public String getAdvice(String questionType, String question, String context, String language) {
        if (!isHealthy()) {
            log.warn("Ark AI 服务不可用，跳过文本建议");
            return null;
        }

        String prompt = buildAdvicePrompt(questionType, question, context, language);
        return sendTextRequest(prompt);
    }

    public String chat(String message, String imageInput, String language) {
        if (!isHealthy()) {
            log.warn("Ark AI 服务不可用，跳过对话");
            return null;
        }

        String prompt = (message == null || message.isBlank())
            ? ("zh".equals(language) ? "请描述这张图片，并结合健身与饮食场景给出建议。" : "Describe this image and provide fitness or nutrition advice.")
            : message;

        if (imageInput != null && !imageInput.isBlank()) {
            return sendVisionRequest(imageInput, prompt);
        }
        return sendTextRequest(prompt);
    }

    public boolean isHealthy() {
        if (!enabled) {
            log.warn("Ark AI 服务未启用");
            return false;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Ark API Key 未配置");
            return false;
        }
        if (model == null || model.isBlank()) {
            log.warn("Ark 模型/Endpoint 未配置");
            return false;
        }
        return true;
    }

    public boolean testConnection() {
        try {
            String result = sendTextRequest("Reply with OK only.");
            return result != null && !result.isBlank();
        } catch (Exception e) {
            log.error("Ark AI 连接测试失败", e);
            return false;
        }
    }

    private String sendTextRequest(String textPrompt) {
        List<Map<String, Object>> content = new ArrayList<>();
        Map<String, Object> textContent = new HashMap<>();
        textContent.put("type", "text");
        textContent.put("text", textPrompt);
        content.add(textContent);
        return sendChatCompletion(content);
    }

    private String sendVisionRequest(String imageInput, String textPrompt) {
        List<Map<String, Object>> content = new ArrayList<>();

        Map<String, Object> textContent = new HashMap<>();
        textContent.put("type", "text");
        textContent.put("text", textPrompt);
        content.add(textContent);

        Map<String, Object> imageContent = new HashMap<>();
        imageContent.put("type", "image_url");
        Map<String, String> imageUrlMap = new HashMap<>();
        imageUrlMap.put("url", normalizeImageInput(imageInput));
        imageContent.put("image_url", imageUrlMap);
        content.add(imageContent);

        return sendChatCompletion(content);
    }

    private String sendChatCompletion(List<Map<String, Object>> content) {
        try {
            configureTimeouts();

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("stream", false);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", content);
            requestBody.put("messages", List.of(message));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String url = baseUrl + "/chat/completions";
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("发送 Ark 请求: url={}, model={}", url, model);

            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                String.class
            );

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.error("Ark API 请求失败: statusCode={}, body={}", response.getStatusCode(), response.getBody());
                return null;
            }

            JsonNode jsonResponse = objectMapper.readTree(response.getBody());
            String aiResponse = jsonResponse.path("choices").path(0).path("message").path("content").asText();
            if (aiResponse == null || aiResponse.isBlank()) {
                log.error("Ark API 返回空内容: body={}", response.getBody());
                return null;
            }

            return aiResponse;
        } catch (Exception e) {
            log.error("调用 Ark API 失败", e);
            return null;
        }
    }

    private void configureTimeouts() {
        if (!(restTemplate.getRequestFactory() instanceof SimpleClientHttpRequestFactory factory)) {
            return;
        }

        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
    }

    private String buildFoodRecognitionPrompt(String language) {
        if ("zh".equals(language)) {
            return "请识别图片中的食物，并严格只返回 JSON。格式如下：\n" +
                "{\n" +
                "  \"foods\": [\n" +
                "    {\n" +
                "      \"name\": \"食物名称\",\n" +
                "      \"confidence\": 0.95,\n" +
                "      \"estimatedWeight\": 150,\n" +
                "      \"nutrition\": {\n" +
                "        \"calories\": 250,\n" +
                "        \"protein\": 20,\n" +
                "        \"carbs\": 15,\n" +
                "        \"fat\": 8\n" +
                "      }\n" +
                "    }\n" +
                "  ],\n" +
                "  \"totalNutrition\": {\n" +
                "    \"calories\": 250,\n" +
                "    \"protein\": 20,\n" +
                "    \"carbs\": 15,\n" +
                "    \"fat\": 8\n" +
                "  }\n" +
                "}\n" +
                "要求：\n" +
                "1. 只能返回 JSON，不要 Markdown，不要解释。\n" +
                "2. 数值直接给数字。\n" +
                "3. 如果有多种食物，请拆分到 foods 数组。";
        }

        return "Recognize the food in this image and return JSON only in this format:\n" +
            "{\n" +
            "  \"foods\": [\n" +
            "    {\n" +
            "      \"name\": \"food name\",\n" +
            "      \"confidence\": 0.95,\n" +
            "      \"estimatedWeight\": 150,\n" +
            "      \"nutrition\": {\n" +
            "        \"calories\": 250,\n" +
            "        \"protein\": 20,\n" +
            "        \"carbs\": 15,\n" +
            "        \"fat\": 8\n" +
            "      }\n" +
            "    }\n" +
            "  ],\n" +
            "  \"totalNutrition\": {\n" +
            "    \"calories\": 250,\n" +
            "    \"protein\": 20,\n" +
            "    \"carbs\": 15,\n" +
            "    \"fat\": 8\n" +
            "  }\n" +
            "}\n" +
            "Return JSON only. No markdown. No explanation.";
    }

    private String buildPosePrompt(String exerciseName, String language) {
        if ("zh".equals(language)) {
            return String.format(
                "你是一位友好的健身教练。分析图片中的【%s】运动姿态，只返回 JSON：\n" +
                    "{\n" +
                    "  \"score\": 0-100,\n" +
                    "  \"isCorrect\": true,\n" +
                    "  \"issues\": [\"问题1\", \"问题2\"],\n" +
                    "  \"suggestions\": [\"建议1\", \"建议2\"]\n" +
                    "}\n" +
                    "只返回 JSON，不要 Markdown，不要额外解释。",
                exerciseName
            );
        }

        return String.format(
            "You are a friendly fitness coach. Analyze the %s pose and return JSON only:\n" +
                "{\n" +
                "  \"score\": 0-100,\n" +
                "  \"isCorrect\": true,\n" +
                "  \"issues\": [\"issue1\", \"issue2\"],\n" +
                "  \"suggestions\": [\"suggestion1\", \"suggestion2\"]\n" +
                "}\n" +
                "Return JSON only. No markdown. No explanation.",
            exerciseName
        );
    }

    private String buildAdvicePrompt(String questionType, String question, String context, String language) {
        String safeType = questionType == null || questionType.isBlank() ? "general" : questionType;
        String safeQuestion = question == null || question.isBlank()
            ? ("zh".equals(language) ? "请给我建议。" : "Please give me practical advice.")
            : question;
        String safeContext = context == null ? "" : context.trim();

        if ("zh".equals(language)) {
            return "你是 FitBite Pal 的 AI 健身和营养助手。请基于以下内容给出实用、简洁、可执行的建议。\n" +
                "类型: " + safeType + "\n" +
                "问题: " + safeQuestion + "\n" +
                (safeContext.isBlank() ? "" : "上下文: " + safeContext + "\n");
        }

        return "You are the FitBite Pal AI fitness and nutrition assistant. Give practical and concise advice.\n" +
            "Type: " + safeType + "\n" +
            "Question: " + safeQuestion + "\n" +
            (safeContext.isBlank() ? "" : "Context: " + safeContext + "\n");
    }

    private FoodRecognitionResponse parseFoodRecognition(String aiResponse) {
        try {
            String jsonText = extractJsonObject(stripCodeFence(aiResponse));
            JsonNode root = objectMapper.readTree(jsonText);

            List<FoodRecognitionResponse.FoodItem> foods = new ArrayList<>();
            JsonNode foodsNode = root.path("foods");
            if (foodsNode.isArray()) {
                for (JsonNode foodNode : foodsNode) {
                    foods.add(
                        FoodRecognitionResponse.FoodItem.builder()
                            .name(foodNode.path("name").asText(""))
                            .confidence(readNullableDouble(foodNode, "confidence"))
                            .estimatedWeight(readNullableDouble(foodNode, "estimatedWeight"))
                            .nutrition(parseNutrition(foodNode.path("nutrition")))
                            .build()
                    );
                }
            }

            FoodRecognitionResponse.NutritionInfo totalNutrition = parseNutrition(root.path("totalNutrition"));
            if (foods.isEmpty()) {
                return null;
            }

            return FoodRecognitionResponse.builder()
                .foods(foods)
                .totalNutrition(totalNutrition != null ? totalNutrition : sumNutrition(foods))
                .build();
        } catch (Exception e) {
            log.error("解析 Ark 食物识别响应失败: response={}", aiResponse, e);
            return null;
        }
    }

    private FoodRecognitionResponse.NutritionInfo parseNutrition(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        return FoodRecognitionResponse.NutritionInfo.builder()
            .calories(readNullableDouble(node, "calories"))
            .protein(readNullableDouble(node, "protein"))
            .carbs(readNullableDouble(node, "carbs"))
            .fat(readNullableDouble(node, "fat"))
            .build();
    }

    private FoodRecognitionResponse.NutritionInfo sumNutrition(List<FoodRecognitionResponse.FoodItem> foods) {
        double calories = 0;
        double protein = 0;
        double carbs = 0;
        double fat = 0;

        for (FoodRecognitionResponse.FoodItem food : foods) {
            if (food.getNutrition() == null) {
                continue;
            }
            calories += valueOrZero(food.getNutrition().getCalories());
            protein += valueOrZero(food.getNutrition().getProtein());
            carbs += valueOrZero(food.getNutrition().getCarbs());
            fat += valueOrZero(food.getNutrition().getFat());
        }

        return FoodRecognitionResponse.NutritionInfo.builder()
            .calories(calories)
            .protein(protein)
            .carbs(carbs)
            .fat(fat)
            .build();
    }

    private String stripCodeFence(String text) {
        String jsonText = text == null ? "" : text.trim();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.substring(7);
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.substring(3);
        }
        if (jsonText.endsWith("```")) {
            jsonText = jsonText.substring(0, jsonText.length() - 3);
        }
        return jsonText.trim();
    }

    private String extractJsonObject(String text) {
        String trimmed = text == null ? "" : text.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private String normalizeImageInput(String imageInput) {
        String normalized = imageInput == null ? "" : imageInput.trim();
        if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("data:image")) {
            return normalized;
        }
        return "data:image/jpeg;base64," + normalized;
    }

    private Double readNullableDouble(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.asDouble();
        }
        String raw = value.asText("").trim();
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private double valueOrZero(Double value) {
        return value == null ? 0 : value;
    }
}
