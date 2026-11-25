package com.fitbitepal.backend.service;

import com.fitbitepal.backend.config.RedisConfig;
import com.fitbitepal.backend.dto.ResetPasswordRequest;
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
        users.findByEmail(address).ifPresent(user -> email.sendVerificationCode(user.getId(), user.getEmail()));
    }

    public boolean verifyCode(String address, String code) {
        return users.findByEmail(address).map(user -> email.verifyCode(user.getId(), user.getEmail(), code)).orElse(false);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_USER, key = "#result")
    public Long resetPassword(ResetPasswordRequest request) {
        User user = users.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        if (!email.consumeCode(user.getId(), user.getEmail(), request.getCode())) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }
        user.setPassword(encoder.encode(request.getNewPassword()));
        return user.getId();
    }
}
