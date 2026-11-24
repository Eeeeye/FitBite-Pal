package com.fitbitepal.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Serializer;
import io.jsonwebtoken.jackson.io.JacksonDeserializer;
import io.jsonwebtoken.jackson.io.JacksonSerializer;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {
    private final SecretKey signingKey;
    private final JwtParser parser;
    private final Serializer<Map<String, ?>> serializer;
    private final long expiration;

    public JwtUtil(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration}") long expiration) {
        signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        serializer = new JacksonSerializer<>();
        parser = Jwts.parser().json(new JacksonDeserializer<>()).verifyWith(signingKey).build();
        this.expiration = expiration;
    }

    public String generateToken(Long userId, String username) {
        long now = System.currentTimeMillis();
        // Builders hold mutable claims. Only the configured codec, parser and key are shared.
        return Jwts.builder().json(serializer)
                .claim("userId", userId)
                .claim("username", username)
                .subject(username)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiration))
                .signWith(signingKey)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        return claims(token).get("userId", Long.class);
    }

    public String getUsernameFromToken(String token) {
        return claims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            claims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    private Claims claims(String token) {
        return parser.parseSignedClaims(token).getPayload();
    }
}
