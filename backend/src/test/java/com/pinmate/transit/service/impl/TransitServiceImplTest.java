package com.pinmate.transit.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** TAGO 응답(response.body.items.item) 변환. 실제 응답 형식(2026-10, 오송역5)을 본떴다 */
class TransitServiceImplTest {

    private static Map<String, Object> body(Object item) {
        return Map.of("response", Map.of("header", Map.of("resultCode", "00"),
                "body", Map.of("items", item == null ? "" : Map.of("item", item))));
    }

    @Test
    @DisplayName("도착 예정: 요청한 노선만, 빨리 오는 순, 초는 분으로 올림")
    void parsesArrivals() {
        Map<String, Object> body = body(List.of(
                Map.of("routeid", "CJB270026500", "routeno", 509, "arrtime", 671, "arrprevstationcnt", 2),
                Map.of("routeid", "CJB270007300", "routeno", 502, "arrtime", 349, "arrprevstationcnt", 3),
                Map.of("routeid", "CJB270011200", "routeno", 747, "arrtime", 120, "arrprevstationcnt", 1)));

        List<Map<String, Object>> arrivals = TransitServiceImpl.parseArrivals(body, List.of("CJB270026500", "CJB270011200"));

        assertThat(arrivals).extracting(a -> a.get("routeNo")).containsExactly("747", "509");
        assertThat(arrivals.get(1)).containsEntry("minutes", 12).containsEntry("stopsAway", 2);
    }

    @Test
    @DisplayName("결과가 1건이면 item 이 객체, 0건이면 items 가 빈 문자열로 온다")
    void handlesSingleAndEmpty() {
        Map<String, Object> one = body(Map.of("gpslati", 36.62, "gpslong", 127.51, "vehicleno", "70자5071", "nodenm", "동부종점"));

        assertThat(TransitServiceImpl.parseBusLocations(one)).singleElement()
                .satisfies(bus -> assertThat(bus).containsEntry("vehicleNo", "70자5071").containsEntry("lat", 36.62));
        assertThat(TransitServiceImpl.parseBusLocations(body(null))).isEmpty();
        assertThat(TransitServiceImpl.parseArrivals(body(null), List.of())).isEmpty();
        assertThat(TransitServiceImpl.items(null)).isEmpty();
    }
}
