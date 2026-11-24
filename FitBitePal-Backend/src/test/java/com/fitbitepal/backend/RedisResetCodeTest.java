package com.fitbitepal.backend;

import com.fitbitepal.backend.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_REDIS_PORT", matches = "[0-9]+")
class RedisResetCodeTest {
    private LettuceConnectionFactory connections;
    private StringRedisTemplate redis;
    private EmailService service;
    private final JavaMailSender mail = mock(JavaMailSender.class);
    private final String address = UUID.randomUUID() + "@example.test";
    private final String key = "fitbitepal:password-reset:" + address;

    @BeforeEach
    void setUp() {
        int port = Integer.parseInt(System.getenv("FITBITE_TEST_REDIS_PORT"));
        connections = new LettuceConnectionFactory("127.0.0.1", port);
        connections.afterPropertiesSet();
        redis = new StringRedisTemplate(connections);
        service = new EmailService(mail, redis);
        ReflectionTestUtils.setField(service, "codeLength", 6);
        ReflectionTestUtils.setField(service, "codeTtlMinutes", 5L);
        ReflectionTestUtils.setField(service, "mailFrom", "test@example.test");
    }

    @AfterEach
    void close() {
        try {
            redis.delete(key);
        } finally {
            connections.destroy();
        }
    }

    @Test
    void precheckPreservesCodeAndExactlyOneResetConsumesIt() throws Exception {
        service.sendVerificationCode(address);
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        var match = Pattern.compile("\\b[0-9]{6}\\b").matcher(message.getValue().getText());
        assertThat(match.find()).isTrue();
        String code = match.group();
        assertThat(service.consumeCode(address, "invalid")).isFalse();
        assertThat(service.verifyCode(address, code)).isTrue();
        assertThat(redis.getExpire(key)).isBetween(1L, 300L);
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        java.util.concurrent.Callable<Boolean> consume = () -> {
            if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("start timed out");
            return service.consumeCode(address, code);
        };
        try {
            var first = pool.submit(consume);
            var second = pool.submit(consume);
            start.countDown();
            assertThat(java.util.List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        } finally {
            pool.shutdownNow();
        }
        assertThat(service.verifyCode(address, code)).isFalse();
    }

    @Test
    void undeliveredCodeIsRemoved() {
        doThrow(new MailSendException("delivery unavailable")).when(mail).send(any(SimpleMailMessage.class));
        assertThatThrownBy(() -> service.sendVerificationCode(address)).isInstanceOf(IllegalStateException.class);
        assertThat(redis.hasKey(key)).isFalse();
    }

    @Test
    void expiredCodeCannotBeVerifiedOrConsumed() {
        service.sendVerificationCode(address);
        String code = redis.opsForValue().get(key);
        assertThat(redis.expire(key, Duration.ZERO)).isTrue();
        assertThat(service.verifyCode(address, code)).isFalse();
        assertThat(service.consumeCode(address, code)).isFalse();
    }
}
