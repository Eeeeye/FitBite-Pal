package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class CompletionItemRequest {
    @NotNull @PositiveOrZero
    private Integer itemIndex;
    @NotNull
    private Boolean completed;
    @Size(max = 100)
    @JsonSetter(nulls = Nulls.SKIP)
    private String itemName = "";
    @JsonSetter(nulls = Nulls.SKIP)
    private Integer calories = 0;
}
