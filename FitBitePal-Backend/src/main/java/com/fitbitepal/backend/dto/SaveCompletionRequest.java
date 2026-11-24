package com.fitbitepal.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveCompletionRequest extends CompletionItemRequest {
    @NotNull @Positive
    private Long userId;
    @NotNull
    private LocalDate date;
    @NotBlank @Size(max = 20)
    private String itemType;
}
