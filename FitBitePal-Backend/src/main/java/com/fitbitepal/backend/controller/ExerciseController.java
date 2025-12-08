package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.model.Exercise;
import com.fitbitepal.backend.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运动库 API 控制器
 * 提供运动信息查询，包括动图、视频等资源
 */
@RestController
@RequestMapping("/exercises")
@RequiredArgsConstructor
@Slf4j
public class ExerciseController {
    
    private final ExerciseRepository exerciseRepository;
    
    /**
     * 获取所有运动
     * GET /api/exercises
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllExercises(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String bodyPart,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String equipment,
            @RequestParam(required = false) String keyword) {
        
        List<Exercise> exercises;
        
        if (keyword != null && !keyword.isEmpty()) {
            // 关键词搜索
            exercises = exerciseRepository.findByNameContainingIgnoreCase(keyword);
        } else if (category != null || bodyPart != null || difficulty != null || equipment != null) {
            // 筛选查询
            exercises = exerciseRepository.findByFilters(category, bodyPart, difficulty, equipment);
        } else {
            // 获取所有启用的运动
            exercises = exerciseRepository.findByEnabledTrue();
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("exercises", exercises);
        result.put("total", exercises.size());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * 获取运动详情
     * GET /api/exercises/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Exercise>> getExerciseById(@PathVariable Long id) {
        return exerciseRepository.findById(id)
                .map(exercise -> ResponseEntity.ok(ApiResponse.success(exercise)))
                .orElse(ResponseEntity.badRequest().body(ApiResponse.error("Exercise not found")));
    }
    
    /**
     * 根据运动名称获取详情（支持中英文）
     * GET /api/exercises/by-name?name=Push-ups
     */
    @GetMapping("/by-name")
    public ResponseEntity<ApiResponse<Exercise>> getExerciseByName(@RequestParam String name) {
        return exerciseRepository.findByName(name)
                .map(exercise -> ResponseEntity.ok(ApiResponse.success(exercise)))
                .orElse(ResponseEntity.badRequest().body(ApiResponse.error("Exercise not found: " + name)));
    }
    
    /**
     * 获取运动动图 URL
     * GET /api/exercises/{id}/gif
     */
    @GetMapping("/{id}/gif")
    public ResponseEntity<ApiResponse<Map<String, String>>> getExerciseGif(@PathVariable Long id) {
        return exerciseRepository.findById(id)
                .map(exercise -> {
                    Map<String, String> result = new HashMap<>();
                    result.put("gifUrl", exercise.getGifUrl());
                    result.put("thumbnailUrl", exercise.getThumbnailUrl());
                    result.put("videoUrl", exercise.getVideoUrl());
                    return ResponseEntity.ok(ApiResponse.success(result));
                })
                .orElse(ResponseEntity.badRequest().body(ApiResponse.error("Exercise not found")));
    }
    
    /**
     * 获取所有分类
     * GET /api/exercises/categories
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        List<String> categories = exerciseRepository.findAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }
    
    /**
     * 获取所有锻炼部位
     * GET /api/exercises/body-parts
     */
    @GetMapping("/body-parts")
    public ResponseEntity<ApiResponse<List<String>>> getBodyParts() {
        List<String> bodyParts = exerciseRepository.findAllBodyParts();
        return ResponseEntity.ok(ApiResponse.success(bodyParts));
    }
    
    /**
     * 获取所有难度等级
     * GET /api/exercises/difficulties
     */
    @GetMapping("/difficulties")
    public ResponseEntity<ApiResponse<List<String>>> getDifficulties() {
        List<String> difficulties = exerciseRepository.findAllDifficulties();
        return ResponseEntity.ok(ApiResponse.success(difficulties));
    }
    
    /**
     * 批量获取运动动图（用于训练计划页面）
     * POST /api/exercises/batch-gifs
     * Body: {"names": ["Push-ups", "Squats", "Plank"]}
     */
    @PostMapping("/batch-gifs")
    public ResponseEntity<ApiResponse<Map<String, String>>> getBatchGifs(@RequestBody Map<String, List<String>> request) {
        List<String> names = request.get("names");
        if (names == null || names.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("names is required"));
        }
        
        Map<String, String> gifMap = new HashMap<>();
        for (String name : names) {
            exerciseRepository.findByName(name)
                    .ifPresent(exercise -> gifMap.put(name, exercise.getGifUrl()));
        }
        
        return ResponseEntity.ok(ApiResponse.success(gifMap));
    }
}

