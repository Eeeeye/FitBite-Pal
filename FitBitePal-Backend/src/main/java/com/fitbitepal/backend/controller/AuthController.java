package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final UserService userService;
    
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
        log.info("收到发送验证码请求 - Email: {}", request.getEmail());
        userService.sendPasswordResetCode(request.getEmail());
        log.info("验证码已成功发送到邮箱: {}", request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Verification code sent to your email", null));
    }
    
    /**
     * 验证验证码
     */
    @PostMapping("/verify-code")
    public ResponseEntity<ApiResponse<Void>> verifyCode(
            @Valid @RequestBody VerifyCodeRequest request) {
        log.info("收到验证码验证请求 - Email: {}", request.getEmail());
        boolean isValid = userService.verifyResetCode(request.getEmail(), request.getCode());
        if (isValid) {
            log.info("验证码验证成功: {}", request.getEmail());
            return ResponseEntity.ok(ApiResponse.success("Verification code is valid", null));
        } else {
            log.warn("验证码验证失败: {}", request.getEmail());
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or expired verification code"));
        }
    }
    
    /**
     * 重置密码
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }
}

