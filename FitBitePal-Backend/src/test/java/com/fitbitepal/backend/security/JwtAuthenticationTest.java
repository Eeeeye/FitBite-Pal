package com.fitbitepal.backend.security;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.util.JwtUtil;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class JwtAuthenticationTest {
    private static final String TEST_SECRET = "isolated-test-only-signing-key-for-jwt-regression";
    private static final long TTL = 3_600_000L;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @CsvSource({"32,HS256", "48,HS384", "64,HS512"})
    void oldAndNewIssuersAndVerifiersInteroperate(int byteLength, String algorithm) {
        // Include multibyte characters to cover the existing UTF-8 secret contract.
        String secret = "汉".repeat(byteLength / 3) + "x".repeat(byteLength % 3);
        SecretKey oldKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        JwtUtil jwt = new JwtUtil(secret, TTL);
        String legacy = Jwts.builder().claim("userId", 17L).claim("username", "member")
                .subject("member").issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + TTL))
                .signWith(oldKey).compact();
        assertThat(jwt.validateToken(legacy)).isTrue();
        assertThat(jwt.getUserIdFromToken(legacy)).isEqualTo(17L);
        assertThat(jwt.getUsernameFromToken(legacy)).isEqualTo("member");

        var oldParser = Jwts.parser().verifyWith(oldKey).build();
        var result = oldParser.parseSignedClaims(jwt.generateToken(17L, "member"));
        assertThat(result.getHeader().getAlgorithm()).isEqualTo(algorithm);
        assertThat(result.getPayload().getSubject()).isEqualTo("member");
        assertThat(result.getPayload().get("username", String.class)).isEqualTo("member");
        assertThat(result.getPayload().get("userId", Long.class)).isEqualTo(17L);
        assertThat(result.getPayload().getExpiration().getTime() - result.getPayload().getIssuedAt().getTime())
                .isEqualTo(TTL);
    }

    @Test
    void aWeakKeyFailsDuringComponentConstruction() {
        assertThatThrownBy(() -> new JwtUtil("weak", TTL)).isInstanceOf(WeakKeyException.class);
    }

    @Test
    void validRequestsVerifyOnceAndObserveCurrentRolesAndAccountDeletion() throws Exception {
        JwtUtil real = new JwtUtil(TEST_SECRET, TTL);
        String token = real.generateToken(42L, "member");
        JwtUtil jwt = spy(real);
        UserRepository users = mock(UserRepository.class);
        User member = new User();
        member.setId(42L);
        member.setRole("ADMIN");
        when(users.findById(42L)).thenReturn(Optional.of(member), Optional.of(member), Optional.empty());
        var filter = new JwtAuthenticationFilter(jwt, users);
        String header = "Bearer " + token;
        assertThat(request(filter, header).getAuthorities()).extracting("authority").containsExactly("ROLE_ADMIN");
        member.setRole("USER");
        assertThat(request(filter, header).getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
        assertThat(request(filter, header)).isNull();
        verify(jwt, times(3)).getUserIdFromToken(token);
        verifyNoMoreInteractions(jwt);
        verify(users, times(3)).findById(42L);
    }

    @Test
    void unusableCredentialsContinueAnonymouslyWithoutReadingAnAccount() throws Exception {
        JwtUtil jwt = new JwtUtil(TEST_SECRET, TTL);
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        String expired = Jwts.builder().claim("userId", 1L).expiration(new Date(0)).signWith(key).compact();
        String wrongKey = new JwtUtil("different-test-only-secret-for-issuer-compatibility", TTL)
                .generateToken(1L, "member");
        String noAccount = Jwts.builder().subject("no-id").signWith(key).compact();
        String wrongType = Jwts.builder().claim("userId", "invalid-id-type").signWith(key).compact();
        UserRepository users = mock(UserRepository.class);
        var filter = new JwtAuthenticationFilter(jwt, users);
        assertThat(request(filter, null)).isNull();
        for (String header : List.of("Basic abc", "Bearer ", "Bearer invalid", "Bearer " + expired,
                "Bearer " + wrongKey, "Bearer " + noAccount, "Bearer " + wrongType)) {
            assertThat(request(filter, header)).isNull();
        }
        verifyNoInteractions(users);
    }

    @Test
    void simultaneousIssuanceAndVerificationPreserveEachCallersClaims() throws Exception {
        JwtUtil jwt = new JwtUtil(TEST_SECRET, TTL);
        int clients = 16;
        var workers = Executors.newFixedThreadPool(clients);
        var ready = new CountDownLatch(clients);
        var start = new CountDownLatch(1);
        List<Future<?>> jobs = new ArrayList<>();
        try {
            for (int i = 0; i < clients; i++) {
                long userId = i + 1L;
                jobs.add(workers.submit(() -> {
                    ready.countDown();
                    assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
                    for (int request = 0; request < 16; request++) {
                        String username = "member-" + userId + "-" + request;
                        String token = jwt.generateToken(userId, username);
                        assertThat(jwt.getUserIdFromToken(token)).isEqualTo(userId);
                        assertThat(jwt.getUsernameFromToken(token)).isEqualTo(username);
                    }
                    return null;
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            for (var job : jobs) job.get(15, TimeUnit.SECONDS);
        } finally {
            start.countDown();
            workers.shutdownNow();
        }
    }

    private Authentication request(JwtAuthenticationFilter filter, String header) throws Exception {
        SecurityContextHolder.clearContext();
        var input = new MockHttpServletRequest();
        if (header != null) input.addHeader("Authorization", header);
        var observed = new AtomicReference<Authentication>();
        var response = new MockHttpServletResponse();
        filter.doFilter(input, response, (req, res) -> {
            observed.set(SecurityContextHolder.getContext().getAuthentication());
            response.setStatus(204);
        });
        assertThat(response.getStatus()).isEqualTo(204);
        return observed.get();
    }
}
