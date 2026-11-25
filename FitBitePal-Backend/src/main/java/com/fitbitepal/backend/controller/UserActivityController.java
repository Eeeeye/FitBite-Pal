package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.CheckInService;
import com.fitbitepal.backend.service.GoalService;
import com.fitbitepal.backend.dto.GoalProgress;
import com.fitbitepal.backend.service.TrainingAdjustmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users/{userId}")
@PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
@RequiredArgsConstructor
public class UserActivityController {
    private final CheckInService checkIns;
    private final GoalService goals;

    @PatchMapping("/goals")
    public ApiResponse<GoalProgress> updateGoals(@PathVariable Long userId, @Valid @RequestBody GoalUpdateRequest request) {
        return ApiResponse.success(goals.update(userId, request));
    }
    private final TrainingAdjustmentService adjustments;

    @PostMapping("/check-in")
    public ApiResponse<CheckInService.Result> save(@PathVariable Long userId, @Valid @RequestBody CheckInRequest request) {
        return ApiResponse.success("Check-in saved successfully", checkIns.save(userId, request));
    }

    @GetMapping("/check-in/status")
    public ApiResponse<Map<String, Object>> status(@PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(checkIns.status(userId, date));
    }

    @GetMapping("/check-in/history")
    public ApiResponse<List<LocalDate>> history(@PathVariable Long userId, @RequestParam(required = false) Integer days) {
        return ApiResponse.success(checkIns.history(userId, days));
    }

    @PostMapping("/adjust-today-plan")
    public ApiResponse<TrainingAdjustmentService.Result> adjust(@PathVariable Long userId,
            @Valid @RequestBody PlanAdjustmentRequest request) {
        var result = adjustments.adjust(userId, request, LocalDate.now());
        return new ApiResponse<>(result.success(), result.message(), result);
    }

    @GetMapping("/today-completion-status")
    public ApiResponse<TrainingAdjustmentService.Status> completion(@PathVariable Long userId) {
        return ApiResponse.success(adjustments.status(userId, LocalDate.now()));
    }
}
