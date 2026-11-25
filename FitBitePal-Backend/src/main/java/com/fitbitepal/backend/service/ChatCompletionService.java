package com.fitbitepal.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.dto.FoodRecognitionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Text and image requests use the selected provider's Chat Completions API. */
@Slf4j
@Service
public class ChatCompletionService {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String provider;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final boolean enabled;

    public ChatCompletionService(ObjectMapper objectMapper, Environment config) {
        provider = config.getProperty("app.ai.provider", "ark").trim().toLowerCase(Locale.ROOT);
        switch (provider) {
            case "openai" -> {
                baseUrl = "https://api.openai.com/v1";
                apiKey = config.getProperty("app.ai.openai.api-key", "").trim();
                model = config.getProperty("app.ai.openai.model", "gpt-4.1-mini").trim();
                enabled = true;
            }
            case "ark" -> {
                baseUrl = config.getProperty("ark.api.base-url", "https://ark.cn-beijing.volces.com/api/coding/v3");
                apiKey = config.getProperty("ark.api.key", "").trim();
                model = config.getProperty("ark.api.model", "doubao-seed-2.0-pro").trim();
                enabled = config.getProperty("ark.api.enabled", Boolean.class, true);
            }
            default -> throw new IllegalArgumentException("AI_PROVIDER must be ark or openai");
        }
        int timeoutMs = config.getProperty("app.ai.ark.timeout", Integer.class, 30000);
        if (timeoutMs < 1) throw new IllegalArgumentException("AI timeout must be positive");
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = objectMapper;
    }

    public FoodRecognitionResponse recognizeFood(String imageInput, String language) {
        if (!isHealthy()) {
            return null;
        }

        if (imageInput == null || imageInput.isBlank()) {
            log.warn("食物识别缺少图片输入");
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
            return null;
        }

        String posePrompt = buildPosePrompt(exerciseName, language);
        return sendVisionRequest(imageInput, posePrompt);
    }

    public String getAdvice(String questionType, String question, String context, String language) {
        if (!isHealthy()) {
            return null;
        }

        String prompt = buildAdvicePrompt(questionType, question, context, language);
        return sendTextRequest(prompt);
    }

    public String chat(String message, String imageInput, String language) {
        if (!isHealthy()) {
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
        return enabled && !apiKey.isBlank() && !model.isBlank();
    }

    public boolean testConnection() {
        if (!isHealthy()) return false;
        String result = sendTextRequest("Reply with OK only.");
        return result != null && !result.isBlank();
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
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("stream", false);
            if (provider.equals("openai")) {
                requestBody.put("store", false);
                requestBody.put("max_completion_tokens", 1200);
            }

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", content);
            requestBody.put("messages", List.of(message));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String url = baseUrl + "/chat/completions";
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.debug("Sending chat completion to {} using {}", provider, model);

            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                String.class
            );

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.warn("{} returned HTTP {}", provider, response.getStatusCode().value());
                return null;
            }

            JsonNode jsonResponse = objectMapper.readTree(response.getBody());
            String aiResponse = jsonResponse.path("choices").path(0).path("message").path("content").asText();
            if (aiResponse == null || aiResponse.isBlank()) {
                log.warn("{} returned empty content", provider);
                return null;
            }

            return aiResponse;
        } catch (RestClientResponseException ex) {
            // Upstream error bodies can contain submitted content or credential fragments.
            log.warn("{} returned HTTP {}", provider, ex.getStatusCode().value());
            return null;
        } catch (ResourceAccessException ex) {
            log.warn("{} transport failed ({})", provider, ex.getMostSpecificCause().getClass().getSimpleName());
            return null;
        } catch (Exception e) {
            log.warn("{} request failed ({})", provider, e.getClass().getSimpleName());
            return null;
        }
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
                    if (foodNode.path("name").asText("").isBlank()) return null;
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
            if (foods.isEmpty()) return null;
            if (totalNutrition == null) totalNutrition = sumNutrition(foods);
            if (totalNutrition == null) return null;

            return FoodRecognitionResponse.builder()
                .foods(foods)
                .totalNutrition(totalNutrition)
                .build();
        } catch (Exception e) {
            log.warn("{} returned invalid food recognition JSON", provider);
            return null;
        }
    }

    private FoodRecognitionResponse.NutritionInfo parseNutrition(JsonNode node) {
        if (node == null || !node.isObject()) return null;
        Double calories = readNullableDouble(node, "calories");
        Double protein = readNullableDouble(node, "protein");
        Double carbs = readNullableDouble(node, "carbs");
        Double fat = readNullableDouble(node, "fat");
        if (calories == null || protein == null || carbs == null || fat == null) return null;
        return FoodRecognitionResponse.NutritionInfo.builder().calories(calories).protein(protein).carbs(carbs).fat(fat).build();
    }

    private FoodRecognitionResponse.NutritionInfo sumNutrition(List<FoodRecognitionResponse.FoodItem> foods) {
        double calories = 0, protein = 0, carbs = 0, fat = 0;
        for (var food : foods) {
            var nutrition = food.getNutrition();
            if (nutrition == null) return null;
            calories += nutrition.getCalories();
            protein += nutrition.getProtein();
            carbs += nutrition.getCarbs();
            fat += nutrition.getFat();
        }
        return FoodRecognitionResponse.NutritionInfo.builder().calories(calories).protein(protein).carbs(carbs).fat(fat).build();
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
        double number = value.asDouble(Double.NaN);
        return Double.isFinite(number) && number >= 0 ? number : null;
    }
}
