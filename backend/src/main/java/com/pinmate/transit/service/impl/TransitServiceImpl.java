package com.pinmate.transit.service.impl;

import com.pinmate.transit.service.TransitService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service("TransitService")
public class TransitServiceImpl implements TransitService {

	private static final String BASE_URL = "https://apis.data.go.kr/1613000";
	private static final String NEARBY_STATIONS = "/BusSttnInfoInqireService/getCrdntPrxmtSttnList";
	private static final String ARRIVALS = "/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList";
	private static final String BUS_LOCATIONS = "/BusLcInfoInqireService/getRouteAcctoBusLcList";

	// 정류장 도시코드는 바뀌지 않아서 기억해 둔다 (폴링마다 근접 정류장 조회를 하지 않게)
	private static final int CITY_CACHE_MAX = 2000;

	private static final ObjectMapper MAPPER = JsonMapper.builder().build();

	// Spring Boot 4에서는 RestClient.Builder가 자동 구성 빈으로 등록되지 않아 직접 만든다
	private final RestClient restClient = RestClient.create();

	private final Map<String, String> cityCodeByNode = new ConcurrentHashMap<>();

	@Value("${tago.service-key:}")
	private String serviceKey;

	@Override
	public Map<String, Object> selectArrivals(double lat, double lng, String nodeId, List<String> routeIds) {
		String cityCode = findCityCode(lat, lng, nodeId);
		Map<String, Object> result = new HashMap<>();
		result.put("cityCode", cityCode);
		result.put("arrivals", cityCode == null
				? List.of()
				: parseArrivals(call(ARRIVALS, Map.of("cityCode", cityCode, "nodeId", nodeId)), routeIds));
		return result;
	}

	@Override
	public List<Map<String, Object>> selectBusLocations(String cityCode, String routeId) {
		return parseBusLocations(call(BUS_LOCATIONS, Map.of("cityCode", cityCode, "routeId", routeId)));
	}

	// 정류장 좌표 근처 정류장 중 nodeid 가 같은 것의 citycode. 없으면(TAGO 미제공 지역) null
	private String findCityCode(double lat, double lng, String nodeId) {
		String cached = cityCodeByNode.get(nodeId);
		if (cached != null) {
			return cached;
		}
		Map<?, ?> body = call(NEARBY_STATIONS, Map.of("gpsLati", String.valueOf(lat), "gpsLong", String.valueOf(lng)));
		for (Map<?, ?> item : items(body)) {
			if (nodeId.equals(text(item.get("nodeid"))) && item.get("citycode") != null) {
				String cityCode = text(item.get("citycode"));
				if (cityCodeByNode.size() >= CITY_CACHE_MAX) {
					cityCodeByNode.clear();
				}
				cityCodeByNode.put(nodeId, cityCode);
				return cityCode;
			}
		}
		return null;
	}

	private Map<?, ?> call(String path, Map<String, String> params) {
		if (serviceKey == null || serviceKey.isBlank()) {
			throw new IllegalStateException("TAGO_SERVICE_KEY 가 없습니다.");
		}
		// 값마다 직접 인코딩한다. UriComponentsBuilder.encode() 는 '+' 를 그대로 둬서
		// Decoding 키의 '+' 가 공백으로 읽혀 인증이 실패한다 (Encoding 키를 넣어도 이중 인코딩돼 실패)
		StringBuilder query = new StringBuilder("serviceKey=").append(encode(serviceKey))
				.append("&_type=json&numOfRows=100&pageNo=1");
		params.forEach((k, v) -> query.append('&').append(k).append('=').append(encode(v)));
		URI uri = URI.create(BASE_URL + path + "?" + query);

		String raw = restClient.get().uri(uri).retrieve().body(String.class);
		if (raw == null || raw.isBlank() || !raw.trim().startsWith("{")) {
			// 키 오류 등은 JSON 이 아닌 XML 로 온다
			throw new IllegalStateException("TAGO 응답 오류: " + (raw == null ? "" : raw.substring(0, Math.min(200, raw.length()))));
		}
		return MAPPER.readValue(raw, Map.class);
	}

	// 도착 예정: routeIds 에 있는 노선만, 빨리 오는 순
	static List<Map<String, Object>> parseArrivals(Map<?, ?> body, List<String> routeIds) {
		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<?, ?> item : items(body)) {
			String routeId = text(item.get("routeid"));
			if (routeIds != null && !routeIds.isEmpty() && !routeIds.contains(routeId)) {
				continue;
			}
			int seconds = item.get("arrtime") instanceof Number n ? n.intValue() : -1;
			if (seconds < 0) {
				continue;
			}
			Map<String, Object> arrival = new HashMap<>();
			arrival.put("routeId", routeId);
			arrival.put("routeNo", text(item.get("routeno")));
			arrival.put("seconds", seconds);
			arrival.put("minutes", (seconds + 59) / 60);
			arrival.put("stopsAway", item.get("arrprevstationcnt") instanceof Number n ? n.intValue() : null);
			list.add(arrival);
		}
		list.sort(Comparator.comparingInt(a -> (Integer) a.get("seconds")));
		return list;
	}

	static List<Map<String, Object>> parseBusLocations(Map<?, ?> body) {
		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<?, ?> item : items(body)) {
			if (!(item.get("gpslati") instanceof Number lat) || !(item.get("gpslong") instanceof Number lng)) {
				continue;
			}
			Map<String, Object> bus = new HashMap<>();
			bus.put("lat", lat.doubleValue());
			bus.put("lng", lng.doubleValue());
			bus.put("vehicleNo", text(item.get("vehicleno")));
			bus.put("nodeName", text(item.get("nodenm")));
			list.add(bus);
		}
		return list;
	}

	// response.body.items.item — 결과가 1건이면 배열이 아니라 객체, 0건이면 items 가 빈 문자열로 온다
	static List<Map<?, ?>> items(Map<?, ?> body) {
		if (body == null || !(body.get("response") instanceof Map<?, ?> response)
				|| !(response.get("body") instanceof Map<?, ?> b) || !(b.get("items") instanceof Map<?, ?> items)) {
			return List.of();
		}
		Object item = items.get("item");
		List<Map<?, ?>> list = new ArrayList<>();
		if (item instanceof List<?> many) {
			for (Object o : many) {
				if (o instanceof Map<?, ?> m) {
					list.add(m);
				}
			}
		} else if (item instanceof Map<?, ?> one) {
			list.add(one);
		}
		return list;
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private static String text(Object value) {
		return value == null ? null : String.valueOf(value);
	}
}
