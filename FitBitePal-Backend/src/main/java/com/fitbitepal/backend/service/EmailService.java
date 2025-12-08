package com.fitbitepal.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.lang.NonNull;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Objects;

/**
 * 邮件发送与验证码管理服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final StringRedisTemplate stringRedisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.security.verification-code.length:6}")
    private int codeLength;

    @Value("${app.security.verification-code.ttl-minutes:5}")
    private long codeTtlMinutes;

    @Value("${app.security.mail.from:noreply@fitbitepal.com}")
    private String mailFrom;

    private static final String CACHE_KEY_PREFIX = "fitbitepal:password-reset:";

    /**
     * 发送验证码邮件
     */
    public void sendVerificationCode(@NonNull String email) {
        String code = Objects.requireNonNull(generateCode(), "verification code must not be null");
        cacheCode(email, code);
        sendEmail(email, code);
    }

    /**
     * 验证用户输入的验证码
     */
    public boolean verifyCode(@NonNull String email, @NonNull String code) {
        ValueOperations<String, String> ops = stringRedisTemplate.opsForValue();
        String cacheKey = Objects.requireNonNull(buildCacheKey(email), "cache key must not be null");
        String cachedCode = ops.get(cacheKey);

        if (cachedCode == null) {
            log.warn("验证码不存在或已过期: {}", email);
            return false;
        }

        boolean valid = cachedCode.equals(code);
        if (valid) {
            stringRedisTemplate.delete(cacheKey);
            log.info("验证码验证成功: {}", email);
        } else {
            log.warn("验证码不匹配: {}", email);
        }
        return valid;
    }

    private void cacheCode(@NonNull String email, @NonNull String code) {
        ValueOperations<String, String> ops = stringRedisTemplate.opsForValue();
        Duration ttl = Objects.requireNonNull(
                Duration.ofMinutes(Math.max(1, codeTtlMinutes)),
                "verification code ttl must not be null"
        );
        String cacheKey = Objects.requireNonNull(buildCacheKey(email), "cache key must not be null");
        String cacheValue = Objects.requireNonNull(code, "verification code must not be null");
        ops.set(
                cacheKey,
                cacheValue,
                ttl
        );
    }

    private void sendEmail(@NonNull String email, @NonNull String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("FitBitePal - Password Reset Code");
            message.setText(String.format(
                    "Your verification code is %s. It will expire in %d minutes.\n\nIf you did not request this, please ignore this email.",
                    code,
                    codeTtlMinutes
            ));
            mailSender.send(message);
            log.info("验证码邮件已发送至 {}", email);
        } catch (Exception ex) {
            log.error("发送验证码邮件失败: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to send verification email");
        }
    }

    private String generateCode() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            builder.append(secureRandom.nextInt(10));
        }
        return builder.toString();
    }

    private String buildCacheKey(@NonNull String email) {
        String normalizedEmail = Objects.requireNonNull(email, "email must not be null").toLowerCase();
        return Objects.requireNonNull(CACHE_KEY_PREFIX + normalizedEmail, "cache key must not be null");
    }
}