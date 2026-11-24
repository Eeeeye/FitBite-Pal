package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.service.PoseRecognitionService;
import com.fitbitepal.backend.service.PoseSessionService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/pose")
@RequiredArgsConstructor
public class PoseController {
    private final PoseRecognitionService recognition;
    private final PoseSessionService sessions;

    @PostMapping("/session/start")
    @PreAuthorize("hasRole('ADMIN') or #request.userId == principal.id")
    public ApiResponse<PoseSessionResponse> startSession(@Valid @RequestBody PoseSessionRequest request) {
        return ApiResponse.success(sessions.start(request));
    }

    @PostMapping("/frame")
    public ApiResponse<PoseFeedbackResponse> analyzeFrame(@Valid @RequestBody PoseFrameRequest request,
                                                          @AuthenticationPrincipal User actor) {
        return ApiResponse.success(recognition.analyzeFrame(request, sessions.active(request.getSessionId(), actor)));
    }

    @PostMapping("/session/end")
    public ApiResponse<PoseSessionResponse> endSession(@Valid @RequestBody PoseEndSessionRequest request,
                                                       @AuthenticationPrincipal User actor) {
        return ApiResponse.success(sessions.end(request, actor));
    }

    @GetMapping("/history/{sessionId}")
    public ApiResponse<PoseSessionHistoryResponse> history(@PathVariable String sessionId, @AuthenticationPrincipal User actor) {
        return ApiResponse.success(sessions.history(sessionId, actor));
    }

    @PostMapping("/session/save")
    @PreAuthorize("hasRole('ADMIN') or #request.userId == principal.id")
    public ApiResponse<String> save(@Valid @RequestBody PoseSaveSessionRequest request, @AuthenticationPrincipal User actor) {
        sessions.save(request, actor);
        return ApiResponse.success("训练数据保存成功");
    }

    @GetMapping("/sessions/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ApiResponse<List<PoseSessionHistoryResponse>> list(@PathVariable Long userId) {
        return ApiResponse.success(sessions.list(userId));
    }

    @DeleteMapping("/session/{sessionId}")
    public ApiResponse<String> delete(@PathVariable String sessionId, @AuthenticationPrincipal User actor) {
        sessions.delete(sessionId, actor);
        return ApiResponse.success("训练会话已删除");
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return recognition.isHealthy() ? ResponseEntity.ok(ApiResponse.success("姿态识别服务运行正常"))
                : ResponseEntity.status(503).body(ApiResponse.error(503, "姿态识别服务不可用"));
    }
}
