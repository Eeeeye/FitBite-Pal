package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BatchCompletionRequest(
        @NotNull @Positive Long userId,
        @NotNull LocalDate date,
        @NotBlank @Size(max = 20) String itemType,
        @NotNull List<@NotNull @Valid CompletionItemRequest> items) {
}
