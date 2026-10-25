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
    @DisplayName("서울 지하철: 행선지는 ' - ' 앞, 다음 역은 뒤에서 '방면' 뺀 것, barvlDt 는 문자열이어도 숫자로, 목록이 없으면 빈 목록")
    void parsesSubwayArrivals() {
        Map<String, Object> body = Map.of("realtimeArrivalList", List.of(
                Map.of("subwayId", "1004", "updnLine", "상행", "trainLineNm", "진접행 - 회현방면",
                        "barvlDt", "180", "arvlMsg2", "3분 후", "btrainSttus", "일반", "arvlCd", "99"),
                Map.of("subwayId", "1001", "updnLine", "하행", "trainLineNm", "인천행 - 남영방면",
                        "barvlDt", 0, "arvlMsg2", "전역 출발", "btrainSttus", "급행")));

        List<Map<String, Object>> trains = TransitServiceImpl.parseSubwayArrivals(body);

        assertThat(trains.get(0)).containsEntry("destination", "진접행").containsEntry("next", "회현").containsEntry("seconds", 180).containsEntry("code", 99)
                .containsEntry("direction", "상행").containsEntry("express", false);
        assertThat(trains.get(1)).containsEntry("express", true).containsEntry("message", "전역 출발");
        assertThat(TransitServiceImpl.parseSubwayArrivals(Map.of("status", 500))).isEmpty();
    }

    @Test
    @DisplayName("공휴일: isHoliday=Y 만 yyyy-MM-dd 로 (특일정보 실제 응답 형식)")
    void parsesHolidays() {
        Map<String, Object> body = body(List.of(
                Map.of("dateName", "삼일절", "isHoliday", "Y", "locdate", 20260301),
                Map.of("dateName", "대체공휴일(삼일절)", "isHoliday", "Y", "locdate", 20260302),
                Map.of("dateName", "기념일", "isHoliday", "N", "locdate", 20260405)));

        assertThat(TransitServiceImpl.parseHolidays(body)).containsExactly("2026-03-01", "2026-03-02");
        assertThat(TransitServiceImpl.parseHolidays(body(null))).isEmpty();
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
