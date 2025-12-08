package com.fitbitepal.backend.dto;

import lombok.Data;

@Data
public class DietRecordRequest {
    private String foodName;
    private String mealType;
    private Integer calories;
    private Integer protein;
    private Integer carbs;
    private Integer fat;
    private String imageUrl;
    private String notes;
}







