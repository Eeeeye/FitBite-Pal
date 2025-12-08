package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.model.PoseSession;
import com.fitbitepal.backend.repository.PoseSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 姿态识别服务
 * 负责运动姿态分析和实时反馈
 * 
 * TODO: 集成真实的姿态识别模型（MediaPipe/TFLite/ONNX）
 * 当前使用 Mock 实现用于开发和测试
 * 
 * @author FitBitePal Team
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PoseRecognitionService {
    
    // 内存中的会话存储（生产环境应使用 Redis）
    private final Map<String, PoseSessionData> activeSessions = new ConcurrentHashMap<>();
    
    // 注入 ModelScope AI 服务
    private final ModelScopeAIService modelScopeAIService;
    
    // 注入姿态会话仓库
    private final PoseSessionRepository poseSessionRepository;
    
    @Value("${app.pose.enabled:false}")
    private boolean poseEnabled;
    
    @Value("${app.pose.use-ai:true}")
    private boolean useAI;
    
    @Value("${app.pose.model-path:}")
    private String modelPath;
    
    /**
     * 开始姿态识别会话
     * 
     * @param request 会话请求
     * @return 会话信息
     */
    public PoseSessionResponse startSession(PoseSessionRequest request) {
        String sessionId = UUID.randomUUID().toString();
        log.info("创建姿态识别会话: sessionId={}, userId={}, exerciseId={}", 
                sessionId, request.getUserId(), request.getExerciseId());
        
        PoseSessionData sessionData = new PoseSessionData();
        sessionData.setSessionId(sessionId);
        sessionData.setUserId(request.getUserId());
        sessionData.setExerciseId(request.getExerciseId());
        sessionData.setExerciseName(request.getExerciseName());
        sessionData.setStartTime(LocalDateTime.now());
        sessionData.setStatus("active");
        sessionData.setFrameCount(0);
        
        activeSessions.put(sessionId, sessionData);
        
        return PoseSessionResponse.builder()
                .sessionId(sessionId)
                .userId(request.getUserId())
                .exerciseId(request.getExerciseId())
                .exerciseName(request.getExerciseName())
                .startTime(sessionData.getStartTime())
                .status("active")
                .build();
    }
    
    /**
     * 分析姿态帧
     * 
     * @param request 帧数据
     * @return 姿态反馈
     */
    public PoseFeedbackResponse analyzeFrame(PoseFrameRequest request) {
        String sessionId = request.getSessionId();
        PoseSessionData session = activeSessions.get(sessionId);
        
        if (session == null) {
            log.error("会话不存在: sessionId={}", sessionId);
            throw new RuntimeException("会话不存在或已过期");
        }
        
        if (!"active".equals(session.getStatus())) {
            log.error("会话未激活: sessionId={}, status={}", sessionId, session.getStatus());
            throw new RuntimeException("会话未激活");
        }
        
        session.setFrameCount(session.getFrameCount() + 1);
        log.info("📸 分析姿态帧: sessionId={}, frame={}, useAI={}, hasImage={}, language={}", 
                 sessionId, request.getFrameNumber(), useAI, 
                 request.getImageBase64() != null && !request.getImageBase64().isEmpty(),
                 request.getLanguage());
        
        // 如果启用AI且有图片数据，使用 ModelScope AI 分析
        if (useAI && request.getImageBase64() != null && !request.getImageBase64().isEmpty()) {
            log.info("🤖 准备调用 ModelScope AI 分析姿态... language={}", request.getLanguage());
            try {
                PoseFeedbackResponse response = analyzeWithAI(request, session);
                log.info("✅ AI 分析成功返回，score={}", response.getScore());
                return response;
            } catch (Exception e) {
                log.error("❌ AI姿态分析失败，降级到 Mock 数据", e);
                return createMockFeedback(sessionId, request.getFrameNumber());
            }
        }
        
        // 降级方案：使用 Mock 数据
        log.warn("⚠️ 姿态识别使用 Mock 数据（useAI={}, hasImage={}）", useAI, 
                request.getImageBase64() != null && !request.getImageBase64().isEmpty());
        return createMockFeedback(sessionId, request.getFrameNumber());
    }
    
    /**
     * 使用 ModelScope AI 分析姿态
     * 
     * @param request 帧请求
     * @param session 会话数据
     * @return 姿态反馈
     */
    private PoseFeedbackResponse analyzeWithAI(PoseFrameRequest request, PoseSessionData session) {
        String sessionId = request.getSessionId();
        String imageData = request.getImageBase64();
        String exerciseName = request.getExerciseName() != null ? request.getExerciseName() : session.getExerciseName();
        String language = request.getLanguage() != null ? request.getLanguage() : "en"; // ✨ 获取语言设置，默认英文
        
        // 确保图片数据格式正确
        if (!imageData.startsWith("data:image")) {
            imageData = "data:image/jpeg;base64," + imageData;
        }
        
        log.info("🤖 使用 ModelScope AI 分析姿态: exercise={}, frame={}, language={}", exerciseName, request.getFrameNumber(), language);
        
        // 调用 ModelScope AI（提示词在 ModelScopeAIService 中根据语言构建）
        String aiResult = modelScopeAIService.analyzePose(imageData, exerciseName, language); // ✨ 传递语言参数
        
        log.info("📥 AI 返回原始结果: {}", aiResult != null ? aiResult.substring(0, Math.min(300, aiResult.length())) + "..." : "null");
        
        if (aiResult == null || aiResult.isEmpty()) {
            log.warn("AI 返回结果为空，使用 Mock 数据");
            return createMockFeedback(sessionId, request.getFrameNumber());
        }
        
        // 解析 AI 返回的 JSON
        return parseAIResponse(aiResult, sessionId, request.getFrameNumber());
    }
    
    /**
     * 解析 AI 响应为姿态反馈
     * 
     * @param aiResult AI 返回的 JSON 字符串
     * @param sessionId 会话ID
     * @param frameNumber 帧编号
     * @return 姿态反馈
     */
    private PoseFeedbackResponse parseAIResponse(String aiResult, String sessionId, Integer frameNumber) {
        try {
            // 移除可能的 markdown 代码块标记
            String jsonStr = aiResult.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.substring(7);
            }
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.substring(3);
            }
            if (jsonStr.endsWith("```")) {
                jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
            }
            jsonStr = jsonStr.trim();
            
            // 解析 JSON
            com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(jsonStr);
            
            log.info("🔍 解析AI响应JSON: {}", jsonStr.substring(0, Math.min(200, jsonStr.length())) + "...");
            
            double score = rootNode.path("score").asDouble(-1.0);  // ✨ 默认值改为-1，用于检测是否成功解析
            boolean isCorrect = rootNode.path("isCorrect").asBoolean(score >= 85);
            
            log.info("📊 解析得分: score={}, isCorrect={}", score, isCorrect);
            
            // 解析问题列表
            List<String> issues = new ArrayList<>();
            rootNode.path("issues").forEach(node -> issues.add(node.asText()));
            log.info("📋 解析问题列表: issues={}", issues);
            
            // 解析建议列表
            List<String> suggestions = new ArrayList<>();
            rootNode.path("suggestions").forEach(node -> suggestions.add(node.asText()));
            log.info("💡 解析建议列表: suggestions={}", suggestions);
            
            // ✨ 构造纠正建议 - 优化逻辑，确保AI的反馈能够传递
            List<PoseFeedbackResponse.Correction> corrections = new ArrayList<>();
            
            // 如果有问题，每个问题对应一个correction
            for (int i = 0; i < issues.size(); i++) {
                String message = issues.get(i);
                // 如果有对应的建议，附加上
                if (i < suggestions.size() && !suggestions.get(i).isEmpty()) {
                    message += " 💡 " + suggestions.get(i);
                }
                corrections.add(PoseFeedbackResponse.Correction.builder()
                        .bodyPart("general")
                        .issueType("form")
                        .message(message)
                        .severity(score < 30 ? "high" : score < 70 ? "medium" : "low")
                        .build());
            }
            
            // 如果只有建议没有问题，也添加建议
            if (issues.isEmpty() && !suggestions.isEmpty()) {
                for (String suggestion : suggestions) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("general")
                            .issueType("form")
                            .message("💡 " + suggestion)
                            .severity("low")
                            .build());
                }
            }
            
            log.info("✅ 构造了 {} 条 corrections", corrections.size());
            
            // ✨ 如果 corrections 为空，根据情况提供反馈
            if (corrections.isEmpty()) {
                if (score == -1.0) {
                    // 解析失败，使用默认分数75
                    log.warn("⚠️ AI响应解析失败，使用默认分数75");
                    score = 75.0;
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("general")
                            .issueType("form")
                            .message("🟡 动作良好，注意姿态稳定性")
                            .severity("medium")
                            .build());
                } else if (score == 0) {
                    // AI明确返回0分，说明没有做相应动作
                    log.info("⚠️ AI返回0分，可能未检测到相应动作");
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("general")
                            .issueType("form")
                            .message("❌ 未检测到相应的运动动作，请确保正确执行训练")
                            .severity("high")
                            .build());
                } else {
                    // 有分数但没有具体建议
                    log.info("⚠️ AI 未返回具体建议，根据分数 {} 生成通用反馈", score);
                    if (score >= 90) {
                        corrections.add(PoseFeedbackResponse.Correction.builder()
                                .bodyPart("general")
                                .issueType("form")
                                .message("✅ 动作标准，保持！")
                                .severity("low")
                                .build());
                    } else if (score >= 75) {
                        corrections.add(PoseFeedbackResponse.Correction.builder()
                                .bodyPart("general")
                                .issueType("form")
                                .message("🟡 动作良好，注意姿态稳定性")
                                .severity("medium")
                                .build());
                    } else if (score >= 60) {
                        corrections.add(PoseFeedbackResponse.Correction.builder()
                                .bodyPart("general")
                                .issueType("form")
                                .message("🟠 姿态需要调整，注意动作规范")
                                .severity("medium")
                                .build());
                    } else {
                        corrections.add(PoseFeedbackResponse.Correction.builder()
                                .bodyPart("general")
                                .issueType("form")
                                .message("🔴 动作不规范，建议重新学习标准姿势")
                                .severity("high")
                                .build());
                    }
                }
            }
            
            // 确定整体状态
            String overallStatus;
            if (score >= 90) {
                overallStatus = "correct";
            } else if (score >= 75) {
                overallStatus = "needs_improvement";
            } else {
                overallStatus = "incorrect";
            }
            
            log.info("AI 姿态分析完成: score={}, isCorrect={}, issues={}, corrections={}", 
                    score, isCorrect, issues.size(), corrections.size());
            
            return PoseFeedbackResponse.builder()
                    .sessionId(sessionId)
                    .frameNumber(frameNumber)
                    .score(score)
                    .overallStatus(overallStatus)
                    .corrections(corrections)
                    .timestamp(LocalDateTime.now())
                    .build();
            
        } catch (Exception e) {
            log.error("解析 AI 响应失败: {}", aiResult, e);
            return createMockFeedback(sessionId, frameNumber);
        }
    }
    
    /**
     * 结束姿态识别会话
     * 
     * @param request 结束请求
     * @return 会话统计
     */
    public PoseSessionResponse endSession(PoseEndSessionRequest request) {
        String sessionId = request.getSessionId();
        PoseSessionData session = activeSessions.get(sessionId);
        
        if (session == null) {
            log.error("会话不存在: sessionId={}", sessionId);
            throw new RuntimeException("会话不存在");
        }
        
        session.setStatus(request.getStatus());
        session.setCompletedReps(request.getCompletedReps());
        session.setDurationSeconds(request.getDurationSeconds());
        
        log.info("结束姿态识别会话: sessionId={}, reps={}, duration={}s", 
                sessionId, request.getCompletedReps(), request.getDurationSeconds());
        
        // TODO: 保存会话数据到数据库
        
        // 从活动会话中移除
        activeSessions.remove(sessionId);
        
        return PoseSessionResponse.builder()
                .sessionId(sessionId)
                .userId(session.getUserId())
                .exerciseId(session.getExerciseId())
                .exerciseName(session.getExerciseName())
                .startTime(session.getStartTime())
                .status(session.getStatus())
                .build();
    }
    
    /**
     * 获取会话历史
     * 
     * @param sessionId 会话 ID
     * @return 会话历史数据
     */
    public Object getSessionHistory(String sessionId) {
        log.info("获取会话历史: sessionId={}", sessionId);
        
        Optional<PoseSession> sessionOpt = poseSessionRepository.findBySessionId(sessionId);
        
        if (sessionOpt.isEmpty()) {
        Map<String, Object> history = new HashMap<>();
        history.put("sessionId", sessionId);
            history.put("message", "会话不存在");
            return history;
        }
        
        PoseSession session = sessionOpt.get();
        
        return PoseSessionHistoryResponse.builder()
                .sessionId(session.getSessionId())
                .exerciseName(session.getExerciseName())
                .trainingDate(session.getTrainingDate())
                .duration(session.getDuration())
                .calories(session.getCalories())
                .reps(session.getReps())
                .logs(session.getLogs())
                .build();
    }
    
    /**
     * 保存训练会话数据
     * 
     * @param request 会话数据请求
     * @return 是否保存成功
     */
    public boolean savePoseSessionData(PoseSaveSessionRequest request) {
        log.info("保存训练会话数据: sessionId={}, userId={}, exerciseName={}", 
                request.getSessionId(), request.getUserId(), request.getExerciseName());
        
        try {
            PoseSession session = PoseSession.builder()
                    .sessionId(request.getSessionId())
                    .userId(request.getUserId())
                    .exerciseName(request.getExerciseName())
                    .duration(request.getDuration())
                    .calories(request.getCalories())
                    .reps(request.getReps())
                    .logs(request.getLogs())
                    .videoUri(request.getVideoUri()) // ✨ 保存视频URI
                    .trainingDate(LocalDateTime.now())
                    .build();
            
            poseSessionRepository.save(session);
            log.info("训练会话数据已保存: sessionId={}, videoUri={}", 
                    request.getSessionId(), request.getVideoUri());
            
            return true;
        } catch (Exception e) {
            log.error("保存训练会话数据失败", e);
            return false;
        }
    }
    
    /**
     * 获取用户所有训练会话列表
     * 
     * @param userId 用户ID
     * @return 会话列表
     */
    public List<PoseSessionHistoryResponse> getUserPoseSessions(Long userId) {
        log.info("获取用户训练会话列表: userId={}", userId);
        
        try {
            List<PoseSession> sessions = poseSessionRepository.findByUserIdOrderByTrainingDateDesc(userId);
            
            return sessions.stream()
                    .map(session -> PoseSessionHistoryResponse.builder()
                            .sessionId(session.getSessionId())
                            .exerciseName(session.getExerciseName())
                            .trainingDate(session.getTrainingDate())
                            .duration(session.getDuration())
                            .calories(session.getCalories())
                            .reps(session.getReps())
                            .logs(session.getLogs())
                            .videoUri(session.getVideoUri()) // ✨ 返回视频URI
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("获取用户训练会话列表失败", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 删除训练会话
     * 
     * @param sessionId 会话ID
     * @return 是否删除成功
     */
    public boolean deletePoseSession(String sessionId) {
        log.info("删除训练会话: sessionId={}", sessionId);
        
        try {
            Optional<PoseSession> sessionOpt = poseSessionRepository.findBySessionId(sessionId);
            
            if (sessionOpt.isEmpty()) {
                log.warn("训练会话不存在: sessionId={}", sessionId);
                return false;
            }
            
            poseSessionRepository.delete(sessionOpt.get());
            log.info("训练会话已删除: sessionId={}", sessionId);
            
            return true;
        } catch (Exception e) {
            log.error("删除训练会话失败", e);
            return false;
        }
    }
    
    /**
     * 检查姿态识别服务健康状态
     * 
     * @return 是否健康
     */
    public boolean isHealthy() {
        if (!poseEnabled) {
            log.debug("姿态识别服务未启用");
            return false;
        }
        
        if (modelPath.isEmpty()) {
            log.debug("姿态识别模型路径未配置");
            return false;
        }
        
        // TODO: 检查模型文件是否存在
        // TODO: 检查推理引擎是否正常
        
        return true;
    }
    
    // ==================== Mock 数据方法（开发阶段使用）====================
    
    /**
     * 创建模拟反馈（根据运动类型）
     * ✨ 改进：根据sessionId获取运动名称，针对不同运动给出不同的反馈
     */
    private PoseFeedbackResponse createMockFeedback(String sessionId, Integer frameNumber) {
        PoseSessionData sessionData = activeSessions.get(sessionId);
        String exerciseName = sessionData != null ? sessionData.getExerciseName() : "Unknown";
        
        log.debug("生成模拟反馈 - 运动名称: {}", exerciseName);
        
        // ✨ 根据运动类型给出不同的得分范围和反馈
        double baseScore = 70.0 + (Math.random() * 25.0); // 默认70-95分
        List<PoseFeedbackResponse.Correction> corrections = new ArrayList<>();
        
        // 根据运动名称调整得分和反馈
        String lowerExerciseName = exerciseName.toLowerCase().trim();
        log.debug("运动名称（小写）: {}", lowerExerciseName);
        
        switch (lowerExerciseName) {
            case "high knees":
            case "抬高膝盖":
                baseScore = 70.0 + (Math.random() * 25.0); // 70-95分
                if (baseScore < 85) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("knees")
                            .issueType("height")
                            .message("膝盖抬高不够，应该抬到腰部高度")
                            .severity("medium")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("back")
                            .issueType("posture")
                            .message("保持上身挺直，不要前倾")
                            .severity("medium")
                            .build());
                }
                break;
                
            case "jumping jacks":
            case "开合跳":
                baseScore = 65.0 + (Math.random() * 30.0); // 65-95分
                if (baseScore < 80) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("arms")
                            .issueType("range")
                            .message("手臂应该完全伸直，举过头顶")
                            .severity("medium")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("legs")
                            .issueType("synchronization")
                            .message("双脚跳跃与手臂动作应同步")
                            .severity("low")
                            .build());
                }
                break;
                
            case "push-ups":
            case "俯卧撑":
                baseScore = 60.0 + (Math.random() * 35.0); // 60-95分
                if (baseScore < 85) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("back")
                            .issueType("alignment")
                            .message("保持背部和腿部成一条直线")
                            .severity("high")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("elbows")
                            .issueType("angle")
                            .message("手肘弯曲应达到90度")
                            .severity("medium")
                            .build());
                }
                break;
                
            case "jogging":
            case "慢跑":
                baseScore = 70.0 + (Math.random() * 25.0); // 70-95分
                if (baseScore < 85) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("posture")
                            .issueType("alignment")
                            .message("保持上身挺直，目视前方")
                            .severity("medium")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("legs")
                            .issueType("form")
                            .message("注意步伐节奏，保持均匀呼吸")
                            .severity("low")
                            .build());
                }
                break;
                
            case "squats":
            case "深蹲":
                baseScore = 65.0 + (Math.random() * 30.0); // 65-95分
                if (baseScore < 85) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("knees")
                            .issueType("alignment")
                            .message("膝盖不要超过脚尖")
                            .severity("high")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("hips")
                            .issueType("depth")
                            .message("臀部应该蹲到与膝盖平行的位置")
                            .severity("medium")
                            .build());
                }
                break;
                
            default:
                // 其他运动的通用反馈
                log.info("未匹配到具体运动，使用通用反馈。运动名称: {}", exerciseName);
                baseScore = 70.0 + (Math.random() * 25.0); // 70-95分
                if (baseScore < 85) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("posture")
                            .issueType("general")
                            .message("保持动作标准，注意姿势稳定性")
                            .severity("medium")
                            .build());
                }
                if (baseScore < 75) {
                    corrections.add(PoseFeedbackResponse.Correction.builder()
                            .bodyPart("general")
                            .issueType("form")
                            .message("注意动作幅度和节奏")
                            .severity("low")
                            .build());
                }
                break;
        }
        
        String status;
        if (baseScore >= 90) {
            status = "correct";
        } else if (baseScore >= 75) {
            status = "needs_improvement";
        } else {
            status = "incorrect";
        }
        
        log.info("生成反馈 - 运动: {}, 分数: {}, 状态: {}, 建议数: {}", 
                exerciseName, String.format("%.1f", baseScore), status, corrections.size());
        
        // ✨ 详细记录 corrections
        if (!corrections.isEmpty()) {
            log.info("✅ Corrections 列表:");
            for (int i = 0; i < corrections.size(); i++) {
                PoseFeedbackResponse.Correction c = corrections.get(i);
                log.info("  [{}] bodyPart={}, message={}, severity={}", 
                        i, c.getBodyPart(), c.getMessage(), c.getSeverity());
        }
        } else {
            log.warn("⚠️ Corrections 为空！");
        }
        
        // ✨ 不返回reps和calories，前端不需要这些数据
        PoseFeedbackResponse response = PoseFeedbackResponse.builder()
                .sessionId(sessionId)
                .frameNumber(frameNumber)
                .score(baseScore)
                .overallStatus(status)
                .corrections(corrections)
                .timestamp(LocalDateTime.now())
                .build();
        
        log.info("📤 返回的反馈对象: sessionId={}, score={}, status={}, corrections数量={}", 
                response.getSessionId(), response.getScore(), response.getOverallStatus(), 
                response.getCorrections() != null ? response.getCorrections().size() : 0);
        
        return response;
    }
    
    /**
     * 会话数据内部类
     */
    private static class PoseSessionData {
        private String sessionId;
        private Long userId;
        private Long exerciseId;
        private String exerciseName;
        private LocalDateTime startTime;
        private String status;
        private Integer frameCount;
        private Integer completedReps;
        private Integer durationSeconds;
        
        // Getters and Setters
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        
        public Long getExerciseId() { return exerciseId; }
        public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }
        
        public String getExerciseName() { return exerciseName; }
        public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }
        
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        
        public Integer getFrameCount() { return frameCount; }
        public void setFrameCount(Integer frameCount) { this.frameCount = frameCount; }
        
        public Integer getCompletedReps() { return completedReps; }
        public void setCompletedReps(Integer completedReps) { this.completedReps = completedReps; }
        
        public Integer getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    }
}


