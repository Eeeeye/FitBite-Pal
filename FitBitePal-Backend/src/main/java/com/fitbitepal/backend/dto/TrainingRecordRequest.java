package com.fitbitepal.backend.dto;

import lombok.Data;

@Data
public class TrainingRecordRequest {
    private String exerciseName;
    private String duration;
    private Integer caloriesBurned;
    private String notes;
}







