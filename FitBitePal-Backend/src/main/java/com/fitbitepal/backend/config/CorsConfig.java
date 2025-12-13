package com.fitbitepal.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource; // ⚠️ 注意导入Source接口
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {
    
    /**
     * 定义 CORS 配置源
     * Spring Security 会自动查找名为 "corsConfigurationSource" 的 Bean
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // 允许的来源：使用通配符 * 允许所有（开发环境最方便）
        // 如果想更安全，可以列出具体的: "http://localhost:8081", "http://127.0.0.1:8081" 等
        config.setAllowedOriginPatterns(Arrays.asList("*"));
        
        // 允许的 HTTP 方法
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"));
        
        // 允许的请求头
        config.setAllowedHeaders(Arrays.asList("*"));
        
        // 允许发送凭证 (Cookie, Authorization 头等)
        config.setAllowCredentials(true);
        
        // 暴露给前端的响应头 (例如 JWT Token 通常在 header 里)
        config.setExposedHeaders(Arrays.asList("Authorization", "Link", "X-Total-Count"));
        
        // 预检请求 (OPTIONS) 的缓存时间 (秒)
        config.setMaxAge(3600L);
        
        // 注册配置到所有路径
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return source;
    }
    
    /**
     * 保留 CorsFilter Bean 以兼容非 Security 场景
     */
    @Bean
    public CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource());
    }
}
