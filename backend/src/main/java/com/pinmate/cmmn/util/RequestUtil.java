package com.pinmate.cmmn.util;

import jakarta.servlet.http.HttpServletRequest;

public class RequestUtil {

	private static final int IP_MAX_LENGTH = 45; // IPv6 문자열 최대 길이

	private RequestUtil() {
	}

	public static boolean isAjax(HttpServletRequest request) {
		return "XMLHttpRequest".equals(request.getHeader("X-Requested-With"));
	}

	// 클라이언트 IP. 프록시(nginx)가 앞에 있으면 X-Real-IP 를 넣는다.
	// 헤더는 위조할 수 있으므로 루프백에서 온 요청(같은 서버의 프록시)일 때만 믿는다.
	public static String clientIp(HttpServletRequest request) {
		return clientIp(request.getRemoteAddr(), request.getHeader("X-Real-IP"));
	}

	static String clientIp(String remoteAddr, String realIpHeader) {
		boolean loopback = "127.0.0.1".equals(remoteAddr)
				|| "0:0:0:0:0:0:0:1".equals(remoteAddr)
				|| "::1".equals(remoteAddr);
		if (loopback && realIpHeader != null) {
			String realIp = realIpHeader.trim();
			if (!realIp.isEmpty() && realIp.length() <= IP_MAX_LENGTH) {
				return realIp;
			}
		}
		return remoteAddr;
	}
}
