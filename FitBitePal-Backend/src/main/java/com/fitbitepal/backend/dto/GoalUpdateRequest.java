package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;

@Getter
public class GoalUpdateRequest {
    @DecimalMin("30") @DecimalMax("300")
    private Double weight;
    @DecimalMin(value = "0", inclusive = false) @DecimalMax("100")
    private Double bodyFat;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private boolean weightSpecified;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private boolean bodyFatSpecified;

    @JsonSetter("weight")
    public void setWeight(Double value) {
        weight = value;
        weightSpecified = true;
    }

    @JsonSetter("bodyFat")
    public void setBodyFat(Double value) {
        bodyFat = value;
        bodyFatSpecified = true;
    }
}
