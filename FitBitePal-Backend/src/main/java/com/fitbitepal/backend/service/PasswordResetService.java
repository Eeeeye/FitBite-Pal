package com.fitbitepal.backend.service;

import com.fitbitepal.backend.config.RedisConfig;
import com.fitbitepal.backend.dto.ResetPasswordRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private final UserRepository users;
    private final EmailService email;
    private final PasswordEncoder encoder;

    public void sendCode(String address) {
        if (!users.existsByEmail(address)) {
            throw new ResourceNotFoundException("Email not found");
        }
        email.sendVerificationCode(address);
    }

    public boolean verifyCode(String address, String code) {
        return email.verifyCode(address, code);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_USER, key = "#result")
    public Long resetPassword(ResetPasswordRequest request) {
        if (!email.consumeCode(request.getEmail(), request.getCode())) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
        User user = users.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPassword(encoder.encode(request.getNewPassword()));
        return user.getId();
    }
}
