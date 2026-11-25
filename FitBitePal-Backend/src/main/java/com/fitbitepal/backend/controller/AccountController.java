package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.service.AccountDeletionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AccountController {
    private final AccountDeletionService accounts;

    public record DeleteRequest(@NotBlank String password) {
        @Override public String toString() { return "DeleteRequest[redacted]"; }
    }

    @DeleteMapping("/users/me")
    public ApiResponse<String> deleteOwn(@AuthenticationPrincipal User principal, @Valid @RequestBody DeleteRequest request) {
        accounts.deleteOwn(principal.getId(), request.password());
        return ApiResponse.success("Account deleted");
    }
}
