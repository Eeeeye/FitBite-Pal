package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.PlanAdjustmentRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TrainingAdjustmentService {
    private final UserRepository users;
    private final TrainingPlanRepository training;
    private final CompletionRecordRepository completions;
    private final DynamicPlanGenerationService generator;
    private final UserService profiles;

    public record Status(boolean hasCompletedExercises, long completedCount, long totalCount,
                         int maxValidIndex, LocalDate date) {}
    public record Result(boolean success, boolean hasCompletedExercises, long completedCount, String message,
                         long newPlanCount, Integer trainingDuration, String goal) {}

    @Transactional(readOnly = true)
    public Status status(Long userId, LocalDate date) {
        var records = completions.findByUserIdAndRecordDateAndItemType(userId, date, "exercise");
        var items = training.findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, date);
        Set<Integer> indices = new HashSet<>();
        for (int position = 0; position < items.size(); position++) {
            Integer order = items.get(position).getOrderIndex();
            indices.add(order != null && order > 0 ? order - 1 : position);
        }
        long completed = records.stream().filter(row -> Boolean.TRUE.equals(row.getCompleted()))
                .filter(row -> indices.contains(row.getItemIndex())).count();
        int maxIndex = indices.stream().mapToInt(Integer::intValue).max().orElse(-1);
        return new Status(completed > 0, completed, records.size(), maxIndex, date);
    }

    @Transactional
    public Result adjust(Long userId, PlanAdjustmentRequest request, LocalDate today) {
        User user = users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Status current = status(userId, today);
        if (current.hasCompletedExercises()) {
            return new Result(false, true, current.completedCount(), "今天有已完成的训练，请先取消所有已勾选的运动",
                    0, user.getTrainingDuration(), user.getGoal());
        }
        if (request.trainingDuration() != null) user.setTrainingDuration(request.trainingDuration());
        if (request.trainingArea() != null) user.setTrainingArea(request.trainingArea());
        if (request.intensity() != null) user.setTrainingIntensity(request.intensity());

        training.deleteByUserIdAndPlanDate(userId, today);
        completions.deleteByUserIdAndRecordDateAndItemType(userId, today, "exercise");
        training.flush();
        generator.generatePlanForUser(user, today);
        long count = training.countByUserIdAndPlanDate(userId, today);
        if (count == 0) throw new IllegalStateException("Training plan replacement produced no items");
        profiles.evictAllUserCaches(userId);
        return new Result(true, false, 0, "训练计划已重新生成", count, user.getTrainingDuration(), user.getGoal());
    }
}
