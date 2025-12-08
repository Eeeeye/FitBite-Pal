package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Double bmi;
    private Double bodyFatRate;
    private Integer bmr;
    private Integer tdee;
    private Integer targetCalories;
    private Integer recommendedProtein;
    private Integer recommendedCarbs;
    private Integer recommendedFat;
}

