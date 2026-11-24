package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.CalorieRecordRequest;
import com.fitbitepal.backend.dto.DietRecordRequest;
import com.fitbitepal.backend.dto.TrainingRecordRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ActivityRecordService {
    private final UserRepository users;
    private final DietRecordRepository diets;
    private final TrainingRecordRepository training;
    private final CalorieRecordRepository calories;

    public DietRecord createDiet(Long userId, DietRecordRequest request) {
        lockUser(userId);
        DietRecord record = new DietRecord();
        record.setUserId(userId);
        record.setFoodName(request.getFoodName());
        record.setMealType(request.getMealType());
        record.setCalories(request.getCalories());
        record.setProtein(request.getProtein());
        record.setCarbs(request.getCarbs());
        record.setFat(request.getFat());
        record.setImageUrl(request.getImageUrl());
        record.setNotes(request.getNotes());
        return diets.save(record);
    }

    public TrainingRecord createTraining(Long userId, TrainingRecordRequest request) {
        lockUser(userId);
        TrainingRecord record = new TrainingRecord();
        record.setUserId(userId);
        record.setExerciseName(request.getExerciseName());
        record.setDuration(request.getDuration());
        record.setCaloriesBurned(request.getCaloriesBurned());
        record.setNotes(request.getNotes());
        return training.save(record);
    }

    public CalorieRecord createCalories(CalorieRecordRequest request) {
        lockUser(request.userId());
        LocalDate today = LocalDate.now();
        CalorieRecord record = calories.findFirstByUserIdAndRecordDateOrderByIdDesc(request.userId(), today)
                .orElseGet(CalorieRecord::new);
        record.setUserId(request.userId());
        record.setRecordDate(today);
        record.setCalorieIntake(request.intake() == null ? 0 : request.intake());
        record.setCalorieExpenditure(request.expenditure() == null ? 0 : request.expenditure());
        return calories.save(record);
    }

    public void deleteDiet(Long id, User actor) {
        if (diets.deleteForActor(id, actor.getId(), "ADMIN".equals(actor.getRole())) == 0) {
            throw new ResourceNotFoundException("Diet record not found");
        }
    }

    private void lockUser(Long userId) {
        users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
