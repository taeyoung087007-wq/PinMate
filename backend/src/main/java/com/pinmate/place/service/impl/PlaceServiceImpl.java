package com.pinmate.place.service.impl;

import com.pinmate.place.service.PlaceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/*
 * 장소(상호명) 검색 구현.
 * 검색 API는 Client Secret을 요구하고 브라우저에서 직접 호출하면 CORS로 막힌다.
 * 그래서 키를 서버에만 두고 이 서비스가 대신 호출한다.
 *
 * Maps 상품에는 검색 API가 없으므로(2026-10 기준) 지역 검색을 쓴다. 두 경로 중 하나를 고른다.
 *   ncp   : NAVER API HUB (naverapihub.apigw.ntruss.com) — NCP 콘솔에서 Application 등록
 *   naver : 네이버 개발자센터 지역 검색 (openapi.naver.com)
 * 두 API 모두 응답 형태가 같다(items[], title, category, address, roadAddress, mapx, mapy).
 */
@Service("PlaceService")
public class PlaceServiceImpl implements PlaceService {

	private static final String API_HUB_URL = "https://naverapihub.apigw.ntruss.com/search/v1/local";
	private static final String NAVER_URL = "https://openapi.naver.com/v1/search/local.json";

	private static final int COUNT = 5;

	// 지역 검색의 mapx/mapy 는 WGS84 도 단위에 10^7 을 곱한 정수로 내려온다
	private static final double COORDINATE_SCALE = 10_000_000d;

	// 건물명으로 찾은 상가는 이 거리 안이면 받아준다 (손가락 범위를 조금 벗어나도)
	private static final int BUILDING_NEARBY_METERS = 100;
	// 주소가 같아도 다른 지역의 같은 도로명일 수 있어 이 안으로 제한한다
	private static final int SAME_ADDRESS_METERS = 300;
	// 건물명이 없는 곳(지방 등)도 찾도록 "동 + 도로명 + 업종"으로도 검색한다
	private static final List<String> ROAD_SEARCH_WORDS = List.of("맛집", "카페", "술집");
	// 한 번의 클릭으로 만들 수 있는 질의 수 상한 (업스트림 호출 제한)
	private static final int MAX_QUERIES = 4;

	// 같은 자리를 다시 눌렀을 때 업스트림을 다시 부르지 않도록 결과를 잠시 들고 있는다
	private static final long CACHE_TTL_MILLIS = 10 * 60 * 1000L;
	private static final int CACHE_MAX_SIZE = 500;

	private record Cached(Map<String, Object> place, long expiresAt) {
	}

	private final Map<String, Cached> nearbyCache = new ConcurrentHashMap<>();

	// NAVER API HUB 은 본문이 JSON 이어도 Content-Type 을 text/plain 으로 내려준다.
	// 그래서 문자열로 받은 뒤 직접 파싱한다.
	private static final ObjectMapper MAPPER = JsonMapper.builder().build();

	// Spring Boot 4에서는 RestClient.Builder가 자동 구성 빈으로 등록되지 않는다 (starter 분리 영향). 여기서는 직접 만든다.
	private final RestClient restClient = RestClient.create();

	@Value("${naver.search.provider:ncp}")
	private String provider;

	@Value("${naver.search.client-id:}")
	private String clientId;

	@Value("${naver.search.client-secret:}")
	private String clientSecret;

	@Override
	public List<Map<String, Object>> search(String query) throws Exception {
		if (clientId.isBlank() || clientSecret.isBlank()) {
			throw new IllegalStateException(
					"장소 검색 키가 없습니다. NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경변수를 설정해 주세요.");
		}

		Map<String, Object> body;
		try {
			var request = restClient.get().uri(buildUri(query));
			if (useApiHub()) {
				request = request.header("X-NCP-APIGW-API-KEY-ID", clientId);
				request = request.header("X-NCP-APIGW-API-KEY", clientSecret);
			} else {
				request = request.header("X-Naver-Client-Id", clientId);
				request = request.header("X-Naver-Client-Secret", clientSecret);
			}
			String raw = request.retrieve().body(String.class);
			if (raw == null || raw.isBlank()) {
				return List.of();
			}
			body = parse(raw);
		} catch (RestClientResponseException e) {
			throw new IllegalStateException(
					"장소 검색 호출에 실패했습니다. (" + e.getStatusCode().value() + ") 키와 API 이용 신청 여부를 확인해 주세요.", e);
		}

		if (body == null || !(body.get("items") instanceof List<?> items)) {
			return List.of();
		}

		List<Map<String, Object>> places = new ArrayList<>();
		for (Object element : items) {
			if (!(element instanceof Map<?, ?> item)) {
				continue;
			}
			String name = clean(text(item.get("title")));
			if (name.isBlank()) {
				continue;
			}
			Map<String, Object> place = new HashMap<>();
			place.put("name", name);
			place.put("category", clean(text(item.get("category"))));
			place.put("address", firstNonBlank(text(item.get("roadAddress")), text(item.get("address"))));
			place.put("lat", toCoordinate(text(item.get("mapy"))));
			place.put("lng", toCoordinate(text(item.get("mapx"))));
			places.add(place);
		}
		return places;
	}

	@Override
	public Map<String, Object> selectNearby(double lat, double lng, int tapMeters,
	                                        String area, String building, String road, String roadNumber) throws Exception {
		String key = cacheKey(lat, lng, tapMeters, building, road, roadNumber);
		Cached cached = nearbyCache.get(key);
		if (cached != null) {
			if (cached.expiresAt() > System.currentTimeMillis()) {
				return cached.place();
			}
			nearbyCache.remove(key);
		}

		Map<String, Object> found = cascade(lat, lng, tapMeters, area, building, road, roadNumber);
		putCache(key, found);
		return found;
	}

	// 질의를 하나씩 시도하고, 조건에 맞는 상가가 나오면 즉시 멈춘다. 프론트에서 12개를 한꺼번에 쏘던 것을 보통 1회로 줄이는 부분이다.
	private Map<String, Object> cascade(double lat, double lng, int tapMeters,
	                                    String area, String building, String road, String roadNumber) {
		List<Map<String, Object>> collected = new ArrayList<>();
		for (String query : buildQueries(area, building, road)) {
			try {
				collected.addAll(search(query));
			} catch (Exception e) {
				// 키가 없거나 업스트림이 실패하면 더 시도하지 않고 주소만 쓰게 한다
				break;
			}
			Map<String, Object> best = pick(collected, lat, lng, tapMeters, building, road, roadNumber);
			if (best != null) {
				return best;
			}
		}
		return null;
	}

	// 검색어를 우선순위대로 만든다: 건물명 → 도로명 + 업종
	private static List<String> buildQueries(String area, String building, String road) {
		String prefix = area == null ? "" : area.trim();
		List<String> queries = new ArrayList<>();

		if (building != null && !building.isBlank()) {
			queries.add(join(prefix, building.trim()));
		}
		if (road != null && !road.isBlank()) {
			for (String word : ROAD_SEARCH_WORDS) {
				if (queries.size() >= MAX_QUERIES) {
					break;
				}
				queries.add(join(prefix, road.trim() + " " + word));
			}
		}
		return queries;
	}

	private static String join(String prefix, String rest) {
		return prefix.isBlank() ? rest : prefix + " " + rest;
	}

	// 후보 중에서 클릭 지점에 가장 맞는 상가를 고른다. 우선순위: 건물명 일치 > 주소 일치 > 최근접
	private static Map<String, Object> pick(List<Map<String, Object>> places, double lat, double lng, int tapMeters,
	                                        String building, String road, String roadNumber) {
		List<Map<String, Object>> located = places.stream()
				.filter(place -> place.get("lat") != null && place.get("lng") != null)
				.toList();
		if (located.isEmpty()) {
			return null;
		}

		List<Map<String, Object>> ofBuilding = building == null || building.isBlank()
				? List.of()
				: located.stream().filter(place -> ((String) place.get("name")).startsWith(building)).toList();
		List<Map<String, Object>> sameAddress = located.stream()
				.filter(place -> isSameRoadAddress((String) place.get("address"), road, roadNumber))
				.toList();

		Map<String, Object> found = nearest(ofBuilding, lat, lng, tapMeters);
		if (found == null) {
			found = nearest(sameAddress, lat, lng, tapMeters);
		}
		if (found == null) {
			found = nearest(located, lat, lng, tapMeters);
		}
		if (found == null) {
			found = nearest(ofBuilding, lat, lng, BUILDING_NEARBY_METERS);
		}
		if (found == null) {
			found = nearest(sameAddress, lat, lng, SAME_ADDRESS_METERS);
		}
		return found;
	}

	// maxMeters 안에 있는 것 중 가장 가까운 후보
	private static Map<String, Object> nearest(List<Map<String, Object>> places, double lat, double lng, double maxMeters) {
		Map<String, Object> best = null;
		double bestDistance = Double.MAX_VALUE;
		for (Map<String, Object> place : places) {
			double distance = distanceMeters(lat, lng, (Double) place.get("lat"), (Double) place.get("lng"));
			if (distance <= maxMeters && distance < bestDistance) {
				best = place;
				bestDistance = distance;
			}
		}
		return best;
	}

	// "… 성수이로 78 1층" 이 도로명 + 건물번호와 같은지 (78 과 78-1 은 다르게 본다)
	static boolean isSameRoadAddress(String placeAddress, String road, String roadNumber) {
		if (placeAddress == null || road == null || roadNumber == null || roadNumber.isBlank()) {
			return false;
		}
		String target = road + " " + roadNumber;
		int at = placeAddress.indexOf(target);
		if (at < 0) {
			return false;
		}
		boolean prevOk = at == 0 || placeAddress.charAt(at - 1) == ' ';
		int end = at + target.length();
		boolean nextOk = end >= placeAddress.length()
				|| !(Character.isDigit(placeAddress.charAt(end)) || placeAddress.charAt(end) == '-');
		return prevOk && nextOk;
	}

	// 수백 m 범위라 평면 근사로 충분하다
	private static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
		double dy = (lat2 - lat1) * 111_320d;
		double dx = (lng2 - lng1) * 111_320d * Math.cos(Math.toRadians(lat1));
		return Math.hypot(dx, dy);
	}

	private static String cacheKey(double lat, double lng, int tapMeters, String building, String road, String roadNumber) {
		return String.format(Locale.US, "%.5f,%.5f,%d,%s,%s,%s",
				lat, lng, tapMeters, blankToEmpty(building), blankToEmpty(road), blankToEmpty(roadNumber));
	}

	private void putCache(String key, Map<String, Object> place) {
		if (nearbyCache.size() >= CACHE_MAX_SIZE) {
			nearbyCache.clear();
		}
		nearbyCache.put(key, new Cached(place, System.currentTimeMillis() + CACHE_TTL_MILLIS));
	}

	private static String blankToEmpty(String value) {
		return value == null ? "" : value;
	}

	private boolean useApiHub() {
		return !"naver".equalsIgnoreCase(provider);
	}

	// text/plain 으로 내려온 JSON 문자열을 Map 으로 바꾼다
	@SuppressWarnings("unchecked")
	private static Map<String, Object> parse(String raw) {
		try {
			return MAPPER.readValue(raw, Map.class);
		} catch (RuntimeException e) {
			throw new IllegalStateException("장소 검색 응답을 해석하지 못했습니다.", e);
		}
	}

	private URI buildUri(String query) {
		UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(useApiHub() ? API_HUB_URL : NAVER_URL)
				.queryParam("query", query)
				.queryParam("display", COUNT)
				.queryParam("start", 1)
				.queryParam("sort", "random");
		if (useApiHub()) {
			builder.queryParam("format", "json");
		}
		return builder.build().encode(StandardCharsets.UTF_8).toUri();
	}

	// mapx/mapy 를 WGS84 도 단위로 변환한다. 값이 10^7 스케일이면 나누고, 이미 도 단위(예: 127.0563)면 그대로 쓴다.
	private static Double toCoordinate(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			double value = Double.parseDouble(raw);
			return Math.abs(value) > 1000 ? value / COORDINATE_SCALE : value;
		} catch (NumberFormatException e) {
			return null;
		}
	}

	private static String text(Object value) {
		return value instanceof String s ? s : "";
	}

	private static String firstNonBlank(String first, String second) {
		return first != null && !first.isBlank() ? first : second;
	}

	// 응답에 <b> 같은 태그가 섞여 오므로 제거한다
	private static String clean(String value) {
		if (value == null) {
			return "";
		}
		return value.replaceAll("<[^>]*>", "").replace("&amp;", "&").trim();
	}
}
