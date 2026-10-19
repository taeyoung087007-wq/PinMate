package com.pinmate.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.fail(e.getReason()));
    }

    /** NOT NULL, FK(존재하지 않는 팀·사용자), CHECK(카테고리) 위반 */
    @ExceptionHandler({DataIntegrityViolationException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception e) {
        log.warn("잘못된 요청: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.fail("요청 데이터가 올바르지 않습니다."));
    }
}
