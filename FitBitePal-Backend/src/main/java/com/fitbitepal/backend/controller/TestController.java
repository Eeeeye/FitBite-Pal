package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 测试控制器 - 用于验证服务器是否正常运行
 */
@RestController
@RequestMapping("/test")
public class TestController {
    
    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ping() {
        Map<String, Object> data = new HashMap<>();
        data.put("message", "FitBitePal Backend is running!");
        data.put("timestamp", LocalDateTime.now());
        data.put("status", "OK");
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}

