package com.pinmate.cmmn.config;

import com.pinmate.interceptor.ApiRequestInterceptor;
import com.pinmate.interceptor.LoginPageInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// 인터셉터 등록. POST 요청 형식 검사는 /api/** 전체, 로그인 검사는 인증·헬스체크를 뺀 /api/**
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(new ApiRequestInterceptor())
				.addPathPatterns("/api/**");

		registry.addInterceptor(new LoginPageInterceptor())
				.addPathPatterns("/api/**")
				.excludePathPatterns("/api/auth/**", "/api/health");
	}
}
