package com.pinmate.interceptor;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.RequestUtil;
import com.pinmate.cmmn.util.Response;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Locale;

// /api/** 의 상태를 바꾸는 요청(POST·PATCH·DELETE …)은 Ajax(JSON) 요청만 받는다 — 다른 사이트의 폼 전송(CSRF) 차단.
// 다른 출처에서 이 헤더나 JSON 본문을 보내려면 브라우저가 CORS 사전 요청을 하는데, 서버는 CORS 를 허용하지 않는다.
public class ApiRequestInterceptor implements HandlerInterceptor {

	// 다른 응답과 같은 모양({code, message, data})으로 내려주기 위해 Response 를 그대로 직렬화한다
	private static final ObjectMapper MAPPER = JsonMapper.builder().build();

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
		String method = request.getMethod();
		if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
			return true;
		}
		// 헤더(X-Requested-With)와 JSON 본문이 둘 다 있어야 통과한다. 하나만 있으면 403
		String contentType = request.getContentType();
		boolean json = contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("application/json");
		if (RequestUtil.isAjax(request) && json) {
			return true;
		}

		response.setStatus(HttpServletResponse.SC_FORBIDDEN);
		response.setContentType("application/json");
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write(MAPPER.writeValueAsString(
				Response.of(Constants.FAIL, "허용되지 않는 요청입니다.", null)));
		return false;
	}
}
