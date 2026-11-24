package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CheckInRequest(@NotNull LocalDate date, @Min(30) @Max(300) Double weight,
                             @Min(100) @Max(250) Double height) {}
