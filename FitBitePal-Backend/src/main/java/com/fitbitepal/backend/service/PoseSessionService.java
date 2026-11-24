package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.PoseSession;
import com.fitbitepal.backend.model.PoseSession.State;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.model.Exercise;
import com.fitbitepal.backend.repository.ExerciseRepository;
import com.fitbitepal.backend.repository.PoseSessionRepository;
import com.fitbitepal.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PoseSessionService {
    private final PoseSessionRepository sessions;
    private final UserRepository users;
    private final ExerciseRepository exercises;
    @Value("${app.pose.draft-retention-days:7}")
    private int draftRetentionDays;

    @Transactional
    public PoseSessionResponse start(PoseSessionRequest request) {
        users.findForUpdate(request.getUserId()).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String exerciseName = request.getExerciseName();
        if (exerciseName == null || exerciseName.isBlank()) {
            if (request.getExerciseId() == null) throw new IllegalArgumentException("请提供运动名称或运动 ID");
            exerciseName = exercises.findById(request.getExerciseId()).map(Exercise::getName)
                    .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        }
        PoseSession session = PoseSession.builder().sessionId(UUID.randomUUID().toString())
                .userId(request.getUserId()).exerciseId(request.getExerciseId()).exerciseName(exerciseName.strip())
                .state(State.ACTIVE).build();
        return response(sessions.save(session));
    }

    public PoseSession active(String id, User actor) {
        PoseSession session = owned(id, actor, false);
        if (session.getState() != State.ACTIVE) {
            throw new IllegalArgumentException("Pose session is not active");
        }
        return session;
    }

    @Transactional
    public PoseSessionResponse end(PoseEndSessionRequest request, User actor) {
        PoseSession session = owned(request.getSessionId(), actor, true);
        State next = "aborted".equalsIgnoreCase(request.getStatus()) ? State.ABORTED : State.COMPLETED;
        if (session.getState() == next || session.getState() == State.SAVED) return response(session);
        if (session.getState() != State.ACTIVE) throw new IllegalArgumentException("Pose session already ended");
        session.setDuration(request.getDurationSeconds());
        session.setReps(request.getCompletedReps());
        session.setState(next);
        return response(session);
    }

    @Transactional
    public void save(PoseSaveSessionRequest request, User actor) {
        PoseSession session = owned(request.getSessionId(), actor, true);
        if (!Objects.equals(session.getUserId(), request.getUserId())) throw notFound();
        if (session.isSaved()) return;
        if (request.getDuration() != null) session.setDuration(request.getDuration());
        if (request.getReps() != null) session.setReps(request.getReps());
        session.setCalories(request.getCalories());
        session.setLogs(request.getLogs());
        session.setVideoUri(request.getVideoUri());
        session.setState(State.SAVED);
    }

    public PoseSessionHistoryResponse history(String id, User actor) {
        PoseSession session = owned(id, actor, false);
        if (!session.isSaved()) throw notFound();
        return historyResponse(session);
    }

    public List<PoseSessionHistoryResponse> list(Long userId) {
        return sessions.findHistory(userId, State.SAVED).stream().map(this::historyResponse).toList();
    }

    @Transactional
    public void delete(String id, User actor) {
        sessions.delete(owned(id, actor, true));
    }

    @Scheduled(fixedDelayString = "${app.pose.draft-cleanup-interval:PT1H}")
    @Transactional
    public void removeExpiredDrafts() {
        sessions.deleteExpiredDrafts(List.of(State.ACTIVE, State.COMPLETED, State.ABORTED), LocalDateTime.now().minusDays(Math.max(1, draftRetentionDays)));
    }

    private PoseSession owned(String id, User actor, boolean lock) {
        PoseSession session = (lock ? sessions.findForUpdate(id) : sessions.findBySessionId(id)).orElseThrow(this::notFound);
        if (!Objects.equals(session.getUserId(), actor.getId()) && !"ADMIN".equals(actor.getRole())) throw notFound();
        return session;
    }

    private ResourceNotFoundException notFound() { return new ResourceNotFoundException("Pose session not found"); }

    private PoseSessionResponse response(PoseSession session) {
        return PoseSessionResponse.builder().sessionId(session.getSessionId()).userId(session.getUserId())
                .exerciseId(session.getExerciseId()).exerciseName(session.getExerciseName())
                .startTime(session.getCreatedAt()).status(session.getState().name().toLowerCase(Locale.ROOT)).build();
    }

    private PoseSessionHistoryResponse historyResponse(PoseSession session) {
        return PoseSessionHistoryResponse.builder().sessionId(session.getSessionId()).exerciseName(session.getExerciseName())
                .trainingDate(session.getTrainingDate()).duration(session.getDuration()).calories(session.getCalories())
                .reps(session.getReps()).logs(session.getLogs()).videoUri(session.getVideoUri()).build();
    }
}
