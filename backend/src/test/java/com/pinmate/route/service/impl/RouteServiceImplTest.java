package com.pinmate.route.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 카카오모빌리티 응답 → { distance, duration, path } 변환 */
class RouteServiceImplTest {

    @Test
    @DisplayName("vertexes 의 (경도, 위도)를 [위도, 경도]로 바꿔 구간을 이어 붙인다")
    void parsesPath() {
        Map<String, Object> body = Map.of("routes", List.of(Map.of(
                "result_code", 0,
                "summary", Map.of("distance", 3200, "duration", 720),
                "sections", List.of(Map.of("roads", List.of(
                        Map.of("vertexes", List.of(127.1, 37.5, 127.2, 37.6)),
                        Map.of("vertexes", List.of(127.3, 37.7))))))));

        Map<String, Object> route = RouteServiceImpl.parseRoute(body);

        assertThat(route).containsEntry("distance", 3200).containsEntry("duration", 720);
        @SuppressWarnings("unchecked")
        List<double[]> path = (List<double[]>) route.get("path");
        assertThat(path).hasSize(3);
        assertThat(path.get(0)).containsExactly(37.5, 127.1);
        assertThat(path.get(2)).containsExactly(37.7, 127.3);
    }

    @Test
    @DisplayName("result_code 가 0 이 아니면(길 없음 등) null")
    void noRoute() {
        Map<String, Object> body = Map.of("routes", List.of(Map.of(
                "result_code", 104, "result_msg", "출발지와 도착지가 5 m 이내로 설정된 경우 경로를 탐색할 수 없음")));

        assertThat(RouteServiceImpl.parseRoute(body)).isNull();
        assertThat(RouteServiceImpl.parseRoute(null)).isNull();
        assertThat(RouteServiceImpl.parseRoute(Map.of("routes", List.of()))).isNull();
    }
}
