package com.fitbitepal.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.dto.PoseFeedbackResponse;
import com.fitbitepal.backend.dto.PoseFrameRequest;
import com.fitbitepal.backend.exception.AiUnavailableException;
import com.fitbitepal.backend.model.PoseSession;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PoseRecognitionService {
    private final ChatCompletionService provider;
    private final ObjectMapper mapper;

    @Value("${app.pose.enabled:false}")
    private boolean enabled;
    @Value("${app.pose.use-ai:true}")
    private boolean useAi;
    @Value("${app.pose.demo-feedback:false}")
    private boolean demo;

    public boolean isHealthy() {
        return enabled && (demo || (useAi && provider.isHealthy()));
    }

    public PoseFeedbackResponse analyzeFrame(PoseFrameRequest request, PoseSession session) {
        if (!enabled) throw new AiUnavailableException("姿态分析暂时不可用");
        String image = request.getImageBase64();
        if (useAi && image != null && !image.isBlank()) {
            String input = image.startsWith("data:image") ? image : "data:image/jpeg;base64," + image;
            String language = request.getLanguage() == null ? "en" : request.getLanguage();
            String result = provider.analyzePose(input, session.getExerciseName(), language);
            if (result != null && !result.isBlank()) {
                try {
                    return parse(result, request);
                } catch (JsonProcessingException | IllegalArgumentException ex) {
                    log.warn("Pose provider returned invalid feedback");
                }
            }
        }
        if (!demo) throw new AiUnavailableException("姿态分析暂时不可用");
        return PoseFeedbackResponse.builder().sessionId(session.getSessionId()).frameNumber(request.getFrameNumber())
                .demo(true).score(80.0).overallStatus("demo").corrections(List.of())
                .timestamp(LocalDateTime.now()).build();
    }

    private PoseFeedbackResponse parse(String result, PoseFrameRequest request) throws JsonProcessingException {
        String json = result.trim();
        if (json.startsWith("```") && json.endsWith("```") && json.indexOf('\n') >= 0) {
            json = json.substring(json.indexOf('\n') + 1, json.length() - 3).trim();
        }
        JsonNode root = mapper.readTree(json);
        double score = root != null && root.path("score").isNumber() ? root.get("score").asDouble() : Double.NaN;
        if (!Double.isFinite(score) || score < 0 || score > 100) {
            throw new IllegalArgumentException("Invalid pose score");
        }
        JsonNode issues = root.path("issues");
        JsonNode suggestions = root.path("suggestions");
        List<PoseFeedbackResponse.Correction> corrections = new ArrayList<>();
        for (int i = 0; i < Math.max(issues.size(), suggestions.size()); i++) {
            String issue = issues.path(i).asText("");
            String suggestion = suggestions.path(i).asText("");
            if (issue.isBlank() && suggestion.isBlank()) continue;
            String message = suggestion.isBlank() ? issue : (issue + " 💡 " + suggestion).strip();
            corrections.add(PoseFeedbackResponse.Correction.builder().bodyPart("general").issueType("form")
                    .message(message).severity(score < 30 ? "high" : score < 70 ? "medium" : "low").build());
        }
        String status = score >= 90 ? "correct" : score >= 75 ? "needs_improvement" : "incorrect";
        return PoseFeedbackResponse.builder().sessionId(request.getSessionId()).frameNumber(request.getFrameNumber())
                .score(score).overallStatus(status).corrections(corrections).timestamp(LocalDateTime.now()).build();
    }
}
