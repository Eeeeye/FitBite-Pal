package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AIController {
    private final AIService ai;

    @PreAuthorize("hasRole('ADMIN') or #request.userId == null or #request.userId == principal.id")
    @PostMapping("/food/recognize")
    public ApiResponse<FoodRecognitionResponse> recognizeFood(@RequestBody FoodRecognitionRequest request) {
        return ApiResponse.success(ai.recognizeFood(request));
    }

    @PreAuthorize("hasRole('ADMIN') or #request.userId == null or #request.userId == principal.id")
    @PostMapping("/advice")
    public ApiResponse<AIAdviceResponse> getAdvice(@RequestBody AIAdviceRequest request) {
        return ApiResponse.success(ai.getAdvice(request));
    }

    @PreAuthorize("hasRole('ADMIN') or #request.userId == null or #request.userId == principal.id")
    @PostMapping("/chat")
    public ApiResponse<String> chat(@RequestBody AIChatRequest request) {
        return ApiResponse.success(ai.chat(request));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ai.isHealthy() ? ResponseEntity.ok(ApiResponse.success("AI 服务已配置"))
                : ResponseEntity.status(503).body(ApiResponse.error("AI 服务不可用"));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/test")
    public ApiResponse<String> testArk() {
        ai.testConnection();
        return ApiResponse.success("Ark AI 连接成功");
    }
}
