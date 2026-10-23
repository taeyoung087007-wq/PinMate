package com.pinmate.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.fail(e.getReason()));
    }

    /**
     * DTO의 @NotBlank / @Size / @Email 등 입력 검증 실패.
     * 필드마다 메시지를 지정해뒀으므로 첫 번째 메시지를 그대로 사용자에게 보여준다.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("요청 값이 올바르지 않습니다.");
        log.warn("입력 검증 실패: {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.fail(message));
    }

    /** NOT NULL, FK(존재하지 않는 팀·사용자), CHECK(카테고리) 위반 */
    @ExceptionHandler({DataIntegrityViolationException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception e) {
        log.warn("잘못된 요청: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.fail("요청 데이터가 올바르지 않습니다."));
    }
}
