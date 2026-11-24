package com.fitbitepal.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableConfigurationProperties(CorsConfig.Policy.class)
public class CorsConfig {
    @ConfigurationProperties("cors")
    public record Policy(List<String> allowedOrigins, List<String> allowedMethods,
                         List<String> allowedHeaders, boolean allowCredentials, long maxAge) {}

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource(Policy policy) {
        CorsConfiguration rules = new CorsConfiguration();
        rules.setAllowedOrigins(policy.allowedOrigins());
        rules.setAllowedMethods(policy.allowedMethods());
        rules.setAllowedHeaders(policy.allowedHeaders());
        rules.setAllowCredentials(policy.allowCredentials());
        rules.setExposedHeaders(List.of("Authorization", "Link", "X-Total-Count"));
        rules.setMaxAge(policy.maxAge());
        rules.validateAllowCredentials();
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", rules);
        return source;
    }
}
