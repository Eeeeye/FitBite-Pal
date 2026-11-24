package com.fitbitepal.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BasicInfoRequest {
    @Getter
    @Size(min = 1, max = 50)
    @Pattern(regexp = "(?s).*\\S.*")
    private String username;

    @Getter
    @Size(max = 20)
    private String phone;
    private boolean phoneProvided;

    @JsonSetter(nulls = Nulls.FAIL)
    public void setUsername(String username) {
        this.username = username;
    }

    public void setPhone(String phone) {
        this.phone = phone;
        this.phoneProvided = true;
    }

    public boolean hasPhone() {
        return phoneProvided;
    }
}
