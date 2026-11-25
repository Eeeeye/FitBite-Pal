package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.exception.AiUnavailableException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AIService {
    private final ChatCompletionService provider;
    @Value("${app.ai.enabled:false}")
    private boolean enabled;

    public boolean isHealthy() {
        return enabled && provider.isHealthy();
    }

    public FoodRecognitionResponse recognizeFood(FoodRecognitionRequest request) {
        String image = imageInput(request.getImageUrl(), request.getImageBase64());
        if (image == null) throw new IllegalArgumentException("请提供食物图片");
        requireAvailable();
        FoodRecognitionResponse result = provider.recognizeFood(image, "zh");
        if (result == null) throw new AiUnavailableException("暂时无法识别食物图片");
        return result;
    }

    public AIAdviceResponse getAdvice(AIAdviceRequest request) {
        requireAvailable();
        String type = StringUtils.hasText(request.getQuestionType()) ? request.getQuestionType() : "general";
        String advice = provider.getAdvice(type, request.getQuestion(), request.getContext(), "zh");
        if (!StringUtils.hasText(advice)) throw new AiUnavailableException("暂时无法生成 AI 建议");
        return AIAdviceResponse.builder().advice(advice).type(type).timestamp(LocalDateTime.now())
                .personalized(StringUtils.hasText(request.getContext())).build();
    }

    public String chat(AIChatRequest request) {
        String image = imageInput(request.getImageUrl(), request.getImageBase64());
        if (image == null && !StringUtils.hasText(request.getMessage())) {
            throw new IllegalArgumentException("请提供消息或图片");
        }
        requireAvailable();
        String result = provider.chat(request.getMessage(), image, request.getLanguage());
        if (!StringUtils.hasText(result)) throw new AiUnavailableException("暂时无法获取 AI 回复");
        return result;
    }

    public void testConnection() {
        requireAvailable();
        if (!provider.testConnection()) throw new AiUnavailableException("AI 连接失败");
    }

    private void requireAvailable() {
        if (!isHealthy()) throw new AiUnavailableException("AI 服务暂时不可用");
    }

    private String imageInput(String url, String base64) {
        if (StringUtils.hasText(url)) return url.trim();
        return StringUtils.hasText(base64) ? base64.trim() : null;
    }
}
