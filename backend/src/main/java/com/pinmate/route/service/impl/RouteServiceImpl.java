package com.pinmate.route.service.impl;

import com.pinmate.route.service.RouteService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("RouteService")
public class RouteServiceImpl implements RouteService {

	private static final String DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";

	private static final ObjectMapper MAPPER = JsonMapper.builder().build();

	// Spring Boot 4에서는 RestClient.Builder가 자동 구성 빈으로 등록되지 않아 직접 만든다
	private final RestClient restClient = RestClient.create();

	@Value("${kakao.rest-api-key:}")
	private String restApiKey;

	@Override
	public Map<String, Object> selectCarRoute(double originLat, double originLng, double destLat, double destLng) {
		if (restApiKey == null || restApiKey.isBlank()) {
			throw new IllegalStateException("KAKAO_REST_API_KEY 가 없습니다.");
		}

		// 카카오모빌리티는 "경도,위도" 순서다
		String uri = UriComponentsBuilder.fromUriString(DIRECTIONS_URL)
				.queryParam("origin", originLng + "," + originLat)
				.queryParam("destination", destLng + "," + destLat)
				.toUriString();

		String raw = restClient.get()
				.uri(uri)
				.header("Authorization", "KakaoAK " + restApiKey)
				.retrieve()
				.body(String.class);

		return parseRoute(raw == null || raw.isBlank() ? null : MAPPER.readValue(raw, Map.class));
	}

	// 응답의 첫 경로만 쓴다. result_code 가 0 이 아니면(출발지=도착지, 너무 가까움, 길 없음 등) null
	static Map<String, Object> parseRoute(Map<?, ?> body) {
		if (body == null || !(body.get("routes") instanceof List<?> routes) || routes.isEmpty()
				|| !(routes.get(0) instanceof Map<?, ?> route)) {
			return null;
		}
		if (!(route.get("result_code") instanceof Number code) || code.intValue() != 0) {
			return null;
		}

		Map<?, ?> summary = route.get("summary") instanceof Map<?, ?> s ? s : Map.of();
		List<double[]> path = new ArrayList<>();
		if (route.get("sections") instanceof List<?> sections) {
			for (Object section : sections) {
				if (!(section instanceof Map<?, ?> sec) || !(sec.get("roads") instanceof List<?> roads)) {
					continue;
				}
				for (Object road : roads) {
					if (!(road instanceof Map<?, ?> r) || !(r.get("vertexes") instanceof List<?> v)) {
						continue;
					}
					// vertexes 는 [x1, y1, x2, y2, ...] (경도, 위도)
					for (int i = 0; i + 1 < v.size(); i += 2) {
						if (v.get(i) instanceof Number x && v.get(i + 1) instanceof Number y) {
							path.add(new double[] { y.doubleValue(), x.doubleValue() });
						}
					}
				}
			}
		}
		if (path.isEmpty()) {
			return null;
		}

		Map<String, Object> result = new HashMap<>();
		result.put("distance", summary.get("distance") instanceof Number d ? d.intValue() : 0);
		result.put("duration", summary.get("duration") instanceof Number t ? t.intValue() : 0);
		result.put("path", path);
		return result;
	}
}
