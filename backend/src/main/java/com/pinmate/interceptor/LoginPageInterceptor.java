package com.pinmate.interceptor;

import com.pinmate.cmmn.util.SessionUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

// 로그인이 필요한 /api/** 요청은 세션에 userId 가 있어야 통과.
// 화면은 프론트(React)가 그리므로 리다이렉트 대신 401 + {"sessionExpired": true} 를 돌려주고, 프론트가 /login 으로 보낸다.
public class LoginPageInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
		if (SessionUtil.getUserId(request.getSession(false)) != null) {
			return true;
		}

		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType("application/json");
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("{\"sessionExpired\": true}");
		return false;
	}
}
