package com.pinmate.place.service.impl;

import com.pinmate.place.dto.PlaceResponse;
import com.pinmate.place.service.PlaceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 장소(상호명) 검색 구현.
 * <p>
 * 검색 API는 Client Secret을 요구하고 브라우저에서 직접 호출하면 CORS로 막힌다.
 * 그래서 키를 서버에만 두고 이 서비스가 대신 호출한다.
 * <p>
 * Maps 상품에는 검색 API가 없으므로(2026-10 기준) 지역 검색을 쓴다. 두 경로 중 하나를 고른다.
 * <ul>
 *   <li>ncp   : NAVER API HUB (naverapihub.apigw.ntruss.com) — NCP 콘솔에서 Application 등록</li>
 *   <li>naver : 네이버 개발자센터 지역 검색 (openapi.naver.com)</li>
 * </ul>
 * 두 API 모두 응답 형태가 같다(items[], title, category, address, roadAddress, mapx, mapy).
 */
@Service
public class PlaceServiceImpl implements PlaceService {

    private static final String API_HUB_URL = "https://naverapihub.apigw.ntruss.com/search/v1/local";
    private static final String NAVER_URL = "https://openapi.naver.com/v1/search/local.json";

    private static final int COUNT = 5;

    // 지역 검색의 mapx/mapy 는 WGS84 도 단위에 10^7 을 곱한 정수로 내려온다
    private static final double COORDINATE_SCALE = 10_000_000d;

    // NAVER API HUB 은 본문이 JSON 이어도 Content-Type 을 text/plain 으로 내려준다.
    // 그래서 문자열로 받은 뒤 직접 파싱한다.
    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private final RestClient restClient;
    private final boolean useApiHub;
    private final String clientId;
    private final String clientSecret;

    public PlaceServiceImpl(
            @Value("${naver.search.provider:ncp}") String provider,
            @Value("${naver.search.client-id:}") String clientId,
            @Value("${naver.search.client-secret:}") String clientSecret) {
        // Spring Boot 4에서는 RestClient.Builder가 자동 구성 빈으로 등록되지 않는다
        // (starter 분리 영향). 여기서는 직접 만든다.
        this.restClient = RestClient.create();
        this.useApiHub = !"naver".equalsIgnoreCase(provider);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public List<PlaceResponse> search(String query) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "장소 검색 키가 없습니다. NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경변수를 설정해 주세요.");
        }

        Map<String, Object> body;
        try {
            var request = restClient.get().uri(buildUri(query));
            if (useApiHub) {
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
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "장소 검색 호출에 실패했습니다. (" + e.getStatusCode().value() + ") 키와 API 이용 신청 여부를 확인해 주세요.");
        }

        if (body == null || !(body.get("items") instanceof List<?> items)) {
            return List.of();
        }

        List<PlaceResponse> places = new ArrayList<>();
        for (Object element : items) {
            if (!(element instanceof Map<?, ?> item)) {
                continue;
            }
            String name = clean(text(item.get("title")));
            if (name.isBlank()) {
                continue;
            }
            places.add(new PlaceResponse(
                    name,
                    clean(text(item.get("category"))),
                    firstNonBlank(text(item.get("roadAddress")), text(item.get("address"))),
                    toCoordinate(text(item.get("mapy"))),
                    toCoordinate(text(item.get("mapx")))));
        }
        return places;
    }

    /** text/plain 으로 내려온 JSON 문자열을 Map 으로 바꾼다 */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> parse(String raw) {
        try {
            return MAPPER.readValue(raw, Map.class);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "장소 검색 응답을 해석하지 못했습니다.");
        }
    }

    private URI buildUri(String query) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(useApiHub ? API_HUB_URL : NAVER_URL)
                .queryParam("query", query)
                .queryParam("display", COUNT)
                .queryParam("start", 1)
                .queryParam("sort", "random");
        if (useApiHub) {
            builder.queryParam("format", "json");
        }
        return builder.build().encode(StandardCharsets.UTF_8).toUri();
    }

    /**
     * mapx/mapy 를 WGS84 도 단위로 변환한다.
     * 값이 10^7 스케일이면 나누고, 이미 도 단위(예: 127.0563)면 그대로 쓴다.
     */
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

    /** 응답에 <b> 같은 태그가 섞여 오므로 제거한다 */
    private static String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("<[^>]*>", "").replace("&amp;", "&").trim();
    }
}
