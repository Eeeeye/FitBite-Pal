package com.fitbitepal.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailService {
    private static final String KEY_PREFIX = "fitbitepal:password-reset:";
    private static final RedisScript<Long> ISSUE = script("issue");
    private static final RedisScript<Long> CHECK = script("check");
    private static final RedisScript<Long> CANCEL = script("cancel");
    private static final int ATTEMPT_LIMIT = 5;
    private static final int RESEND_SECONDS = 60;

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redis;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.security.verification-code.ttl-minutes:5}")
    private long codeTtlMinutes;

    @Value("${app.security.mail.from:noreply@fitbite.test}")
    private String mailFrom;

    private static RedisScript<Long> script(String name) {
        return RedisScript.of(new ClassPathResource("redis/reset-" + name + ".lua"), Long.class);
    }

    public void sendVerificationCode(String address) {
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        String issueId = UUID.randomUUID().toString();
        List<String> key = key(address);
        long ttl = Duration.ofMinutes(Math.max(1, codeTtlMinutes)).toSeconds();
        Long issued = redis.execute(ISSUE, key, code, issueId, Long.toString(ttl),
                Integer.toString(RESEND_SECONDS));
        if (!Long.valueOf(1).equals(issued)) {
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(address);
        message.setSubject("FitBitePal - Password Reset Code");
        message.setText("Your verification code is " + code + ". It will expire in " + ttl / 60
                + " minutes.\n\nIf you did not request this, please ignore this email.");
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            redis.execute(CANCEL, key, issueId);
            throw new IllegalStateException("Failed to send verification email", ex);
        }
    }

    public boolean verifyCode(String address, String code) {
        return check(address, code, false);
    }

    public boolean consumeCode(String address, String code) {
        return check(address, code, true);
    }

    private boolean check(String address, String code, boolean consume) {
        return Long.valueOf(1).equals(redis.execute(CHECK, key(address), code,
                consume ? "1" : "0", Integer.toString(ATTEMPT_LIMIT)));
    }

    private List<String> key(String address) {
        return List.of(KEY_PREFIX + address.toLowerCase(Locale.ROOT));
    }
}