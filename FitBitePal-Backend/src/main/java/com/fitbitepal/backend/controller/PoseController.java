package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.PoseRecognitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 姿态识别控制器
 * 提供运动姿态实时分析和纠正功能
 * 
 * @author FitBitePal Team
 */
@Slf4j
@RestController
@RequestMapping("/pose")
@RequiredArgsConstructor
public class PoseController {
    
    private final PoseRecognitionService poseRecognitionService;
    
    /**
     * 开始姿态识别会话
     * POST /api/pose/session/start (实际路径)
     * 
     * @param request 会话开始请求
     * @return 会话信息，包含 sessionId
     */
    @PostMapping("/session/start")
    public ResponseEntity<ApiResponse<PoseSessionResponse>> startSession(
            @RequestBody PoseSessionRequest request) {
        log.info("开始姿态识别会话: userId={}, exerciseId={}", 
                request.getUserId(), request.getExerciseId());
        
        try {
            PoseSessionResponse response = poseRecognitionService.startSession(request);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("启动会话失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "启动会话失败: " + e.getMessage()));
        }
    }
    
    /**
     * 提交姿态帧数据进行分析
     * POST /api/pose/frame (实际路径)
     * 
     * @param request 帧数据（图片或关键点）
     * @return 实时姿态反馈
     */
    @PostMapping("/frame")
    public ResponseEntity<ApiResponse<PoseFeedbackResponse>> analyzeFrame(
            @RequestBody PoseFrameRequest request) {
        log.debug("收到姿态帧: sessionId={}, frame={}", 
                request.getSessionId(), request.getFrameNumber());
        
        try {
            PoseFeedbackResponse response = poseRecognitionService.analyzeFrame(request);
            
            // ✨ 记录返回给前端的响应
            log.info("📤 [API] 返回姿态反馈: sessionId={}, score={}, corrections数量={}", 
                    response.getSessionId(), 
                    response.getScore(), 
                    response.getCorrections() != null ? response.getCorrections().size() : 0);
            
            if (response.getCorrections() != null && !response.getCorrections().isEmpty()) {
                log.info("📋 [API] Corrections 预览:");
                for (PoseFeedbackResponse.Correction c : response.getCorrections()) {
                    log.info("   - {}", c.getMessage());
                }
            }
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("姿态分析失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "姿态分析失败: " + e.getMessage()));
        }
    }
    
    /**
     * 结束姿态识别会话
     * POST /api/pose/session/end (实际路径)
     * 
     * @param request 会话结束请求
     * @return 会话统计数据
     */
    @PostMapping("/session/end")
    public ResponseEntity<ApiResponse<PoseSessionResponse>> endSession(
            @RequestBody PoseEndSessionRequest request) {
        log.info("结束姿态识别会话: sessionId={}", request.getSessionId());
        
        try {
            PoseSessionResponse response = poseRecognitionService.endSession(request);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("结束会话失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "结束会话失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取会话历史反馈
     * GET /api/pose/history/{sessionId} (实际路径)
     * 
     * @param sessionId 会话 ID
     * @return 该会话的所有姿态反馈记录
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<ApiResponse<Object>> getSessionHistory(
            @PathVariable String sessionId) {
        log.info("获取会话历史: sessionId={}", sessionId);
        
        try {
            Object history = poseRecognitionService.getSessionHistory(sessionId);
            return ResponseEntity.ok(ApiResponse.success(history));
        } catch (Exception e) {
            log.error("获取会话历史失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "获取会话历史失败: " + e.getMessage()));
        }
    }
    
    /**
     * 健康检查端点
     * GET /api/pose/health (实际路径)
     * 
     * @return 姿态识别服务状态
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        boolean healthy = poseRecognitionService.isHealthy();
        if (healthy) {
            return ResponseEntity.ok(ApiResponse.success("姿态识别服务运行正常"));
        } else {
            return ResponseEntity.ok(ApiResponse.error(503, "姿态识别服务不可用"));
        }
    }
    
    /**
     * 保存训练会话数据
     * POST /api/pose/session/save (实际路径)
     * 
     * @param request 会话数据请求
     * @return 保存结果
     */
    @PostMapping("/session/save")
    public ResponseEntity<ApiResponse<String>> savePoseSessionData(
            @RequestBody PoseSaveSessionRequest request) {
        log.info("保存训练会话数据: sessionId={}, userId={}", 
                request.getSessionId(), request.getUserId());
        
        try {
            boolean success = poseRecognitionService.savePoseSessionData(request);
            
            if (success) {
                return ResponseEntity.ok(ApiResponse.success("训练数据保存成功"));
            } else {
                return ResponseEntity.ok(ApiResponse.error(500, "训练数据保存失败"));
            }
        } catch (Exception e) {
            log.error("保存训练数据失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "保存训练数据失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取用户所有训练会话列表
     * GET /api/pose/sessions/{userId} (实际路径)
     * 
     * @param userId 用户ID
     * @return 训练会话列表
     */
    @GetMapping("/sessions/{userId}")
    public ResponseEntity<ApiResponse<java.util.List<PoseSessionHistoryResponse>>> getUserPoseSessions(
            @PathVariable Long userId) {
        log.info("获取用户训练会话列表: userId={}", userId);
        
        try {
            java.util.List<PoseSessionHistoryResponse> sessions = 
                    poseRecognitionService.getUserPoseSessions(userId);
            return ResponseEntity.ok(ApiResponse.success(sessions));
        } catch (Exception e) {
            log.error("获取用户训练会话列表失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "获取训练会话列表失败: " + e.getMessage()));
        }
    }
    
    /**
     * 删除训练会话
     * DELETE /api/pose/session/{sessionId} (实际路径)
     * 
     * @param sessionId 会话ID
     * @return 删除结果
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<String>> deletePoseSession(
            @PathVariable String sessionId) {
        log.info("删除训练会话: sessionId={}", sessionId);
        
        try {
            boolean success = poseRecognitionService.deletePoseSession(sessionId);
            
            if (success) {
                return ResponseEntity.ok(ApiResponse.success("训练会话已删除"));
            } else {
                return ResponseEntity.ok(ApiResponse.error(404, "训练会话不存在"));
            }
        } catch (Exception e) {
            log.error("删除训练会话失败", e);
            return ResponseEntity.ok(ApiResponse.error(500, "删除训练会话失败: " + e.getMessage()));
        }
    }
}

