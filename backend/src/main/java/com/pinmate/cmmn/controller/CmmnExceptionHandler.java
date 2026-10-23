package com.pinmate.cmmn.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

// 컨트롤러 메서드에 들어가기 전에 난 예외(읽을 수 없는 본문, 경로 변수 형식 오류, 없는 경로 …)를 {"code":"99"} 로 바꾼다.
// 컨트롤러 안의 예외는 각 메서드의 try/catch 가 처리한다.
@RestControllerAdvice
public class CmmnExceptionHandler {

	private static final Logger logger = LoggerFactory.getLogger(CmmnExceptionHandler.class);

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Response> handle(Exception e, HttpServletRequest request) {
		int status = statusOf(e);
		if (status >= 500) {
			logger.error("요청 처리 오류: {} {}", request.getMethod(), request.getRequestURI(), e);
		} else {
			logger.warn("잘못된 요청: {} {} ({})", request.getMethod(), request.getRequestURI(), e.getClass().getSimpleName());
		}
		String message = status >= 500 ? "처리 중 오류가 발생했습니다." : "잘못된 요청입니다.";
		return ResponseEntity.status(status).body(Response.of(Constants.FAIL, message, null));
	}

	// Spring MVC 표준 예외(경로 없음 404, 메서드 불일치 405, 필수 파라미터 누락 400 …)는 그 상태, 읽을 수 없는 본문·형식 오류는 400, 나머지 500
	private int statusOf(Exception e) {
		if (e instanceof ErrorResponse errorResponse) {
			return errorResponse.getStatusCode().value();
		}
		if (e instanceof HttpMessageNotReadableException || e instanceof MethodArgumentTypeMismatchException) {
			return HttpStatus.BAD_REQUEST.value();
		}
		return HttpStatus.INTERNAL_SERVER_ERROR.value();
	}
}
