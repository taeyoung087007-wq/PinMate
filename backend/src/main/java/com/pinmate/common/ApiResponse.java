package com.pinmate.common;

/**
 * 모든 API 응답의 공통 형식: {"success": true, "data": ...} / {"success": false, "message": "..."}
 */
public record ApiResponse<T>(boolean success, T data, String message) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
