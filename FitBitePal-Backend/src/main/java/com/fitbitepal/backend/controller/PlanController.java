package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/plans")
@RequiredArgsConstructor
public class PlanController {
    
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    
    /**
     * 获取训练计划
     */
    @GetMapping("/training/{userId}")
    public ResponseEntity<ApiResponse<List<TrainingPlan>>> getTrainingPlan(
            @PathVariable Long userId,
            @RequestParam(required = false) Integer dayOfWeek) {
        List<TrainingPlan> plans;
        if (dayOfWeek != null) {
            plans = trainingPlanRepository.findByUserIdAndDayOfWeekOrderByOrderIndexAsc(userId, dayOfWeek);
        } else {
            plans = trainingPlanRepository.findByUserIdOrderByDayOfWeekAscOrderIndexAsc(userId);
        }
        return ResponseEntity.ok(ApiResponse.success(plans));
    }
    
    /**
     * 获取饮食计划
     */
    @GetMapping("/diet/{userId}")
    public ResponseEntity<ApiResponse<List<DietPlan>>> getDietPlan(@PathVariable Long userId) {
        List<DietPlan> plans = dietPlanRepository.findByUserIdOrderByMealTimeAsc(userId);
        return ResponseEntity.ok(ApiResponse.success(plans));
    }
}

