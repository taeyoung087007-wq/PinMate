package com.pinmate.transit.service;

import java.util.List;
import java.util.Map;

// 실시간 버스 (국토교통부 TAGO). 공공데이터포털 서버 키가 필요해서 서버가 대신 호출한다.
// 정류장·노선 ID 는 ODsay 결과(startLocalStationID, busLocalBlID)를 그대로 쓴다 (TAGO nodeid, routeid 와 같은 값).
public interface TransitService {

	// 정류장 도착 예정. { cityCode, arrivals: [{ routeId, routeNo, minutes, stopsAway }] }
	// lat/lng 는 정류장 좌표 (도시코드를 찾는 데 쓴다). routeIds 가 비어 있으면 모든 노선.
	// TAGO 에 없는 지역(서울 등)이면 cityCode 가 null, arrivals 가 빈 목록. 키가 없으면 IllegalStateException
	Map<String, Object> selectArrivals(double lat, double lng, String nodeId, List<String> routeIds);

	// 노선의 운행 중 버스 위치 [{ lat, lng, vehicleNo, nodeName }]
	List<Map<String, Object>> selectBusLocations(String cityCode, String routeId);

	// 수도권 지하철 역 실시간 도착 (서울시 실시간 지하철 API). stationName 은 "서울", "충무로" 처럼 '역' 을 뺀 이름
	// [{ subwayId, direction(상행·하행·내선·외선), destination, next(다음 역), seconds, message, code(arvlCd), express }]. 키가 없으면 IllegalStateException
	List<Map<String, Object>> selectSubwayArrivals(String stationName);

	// 그해 공휴일 ["2026-01-01", ...] (대체공휴일·선거일 포함, 하루 동안 기억). 지하철 휴일 시간표에 쓴다
	List<String> selectHolidays(int year);
}
