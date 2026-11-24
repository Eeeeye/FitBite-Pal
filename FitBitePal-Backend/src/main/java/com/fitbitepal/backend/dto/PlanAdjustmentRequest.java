package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlanAdjustmentRequest(@Positive Integer trainingDuration, @Size(max = 50) String trainingArea,
                                    @Size(max = 50) String intensity) {}
