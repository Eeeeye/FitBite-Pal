package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.UserService;
import com.fitbitepal.backend.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final UserService userService;
    private final PasswordResetService passwordResetService;
    
    /**
     * 用户注册
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Registration successful", response));
    }
    
    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }
    
    /**
     * 发送密码重置验证码
     */
    @PostMapping("/send-reset-code")
    public ResponseEntity<ApiResponse<Void>> sendResetCode(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.sendCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("If the account exists, a verification code will be sent", null));
    }
    
    /**
     * 验证验证码
     */
    @PostMapping("/verify-code")
    public ResponseEntity<ApiResponse<Void>> verifyCode(
            @Valid @RequestBody VerifyCodeRequest request) {
        boolean isValid = passwordResetService.verifyCode(request.getEmail(), request.getCode());
        if (isValid) {
            return ResponseEntity.ok(ApiResponse.success("Verification code is valid", null));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or expired verification code"));
        }
    }
    
    /**
     * 重置密码
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }
}

