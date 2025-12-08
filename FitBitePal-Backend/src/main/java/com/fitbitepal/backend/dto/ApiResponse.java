package com.fitbitepal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }
    
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
    
    public static <T> ApiResponse<T> error(int code, String message) {
        // 简化版本，将错误码放入消息中
        // 生产环境可能需要单独的 errorCode 字段
        String fullMessage = String.format("[Error %d] %s", code, message);
        return new ApiResponse<>(false, fullMessage, null);
    }
}

