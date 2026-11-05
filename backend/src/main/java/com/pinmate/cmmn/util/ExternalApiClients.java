package com.pinmate.cmmn.util;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 외부 API(카카오모빌리티·TMAP·TAGO·서울 지하철) 호출용 클라이언트.
 * 기본 RestClient.create() 에는 시간 제한이 없어, 상대가 멈추면 요청 스레드가 무한히 붙잡힌다.
 * 화면이 주기적으로 다시 요청하므로 스레드가 바닥나면 로그인까지 전부 멈춘다.
 */
public final class ExternalApiClients {

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
	private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

	private ExternalApiClients() {
	}

	public static RestClient create() {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(CONNECT_TIMEOUT);
		factory.setReadTimeout(READ_TIMEOUT);
		return RestClient.builder().requestFactory(factory).build();
	}
}
