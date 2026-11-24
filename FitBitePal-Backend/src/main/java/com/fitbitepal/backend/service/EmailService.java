package com.fitbitepal.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

/**
 * 邮件发送与验证码管理服务
 */
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

    private static final DefaultRedisScript<Long> CONSUME_CODE = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            end
            return 0
            """, Long.class);

    /**
     * 发送验证码邮件
     */
    public void sendVerificationCode(@NonNull String email) {
        String code = generateCode();
        Duration ttl = Duration.ofMinutes(Math.max(1, codeTtlMinutes));
        stringRedisTemplate.opsForValue().set(buildCacheKey(email), code, ttl);
        try {
            sendEmail(email, code);
        } catch (MailException ex) {
            // A newer delivery may have replaced this code while SMTP was pending.
            consumeCode(email, code);
            throw new IllegalStateException("Failed to send verification email", ex);
        }
    }

    /**
     * 验证用户输入的验证码
     */
    public boolean verifyCode(@NonNull String email, @NonNull String code) {
        return code.equals(stringRedisTemplate.opsForValue().get(buildCacheKey(email)));
    }

    public boolean consumeCode(String email, String code) {
        Long consumed = stringRedisTemplate.execute(CONSUME_CODE, List.of(buildCacheKey(email)), code);
        return Long.valueOf(1).equals(consumed);
    }

    private void sendEmail(@NonNull String email, @NonNull String code) {
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
    }

    private String generateCode() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            builder.append(secureRandom.nextInt(10));
        }
        return builder.toString();
    }

    private String buildCacheKey(@NonNull String email) {
        return CACHE_KEY_PREFIX + email.toLowerCase(Locale.ROOT);
    }
}