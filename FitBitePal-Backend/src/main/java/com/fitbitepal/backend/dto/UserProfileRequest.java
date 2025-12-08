package com.fitbitepal.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserProfileRequest {
    
    @NotBlank(message = "Gender is required")
    private String gender;
    
    @NotNull(message = "Age is required")
    @Min(value = 10, message = "Age must be at least 10")
    @Max(value = 120, message = "Age must be less than 120")
    private Integer age;
    
    @NotNull(message = "Height is required")
    @Min(value = 100, message = "Height must be at least 100 cm")
    @Max(value = 250, message = "Height must be less than 250 cm")
    private Double height;
    
    @NotNull(message = "Weight is required")
    @Min(value = 30, message = "Weight must be at least 30 kg")
    @Max(value = 300, message = "Weight must be less than 300 kg")
    private Double weight;
    
    @NotBlank(message = "Goal is required")
    private String goal;
    
    @NotBlank(message = "Activity level is required")
    private String activityLevel;
    
    @NotNull(message = "Training duration is required")
    @Min(value = 10, message = "Training duration must be at least 10 minutes")
    private Integer trainingDuration;
}

