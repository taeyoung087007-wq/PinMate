package com.pinmate.route.service;

import java.util.Map;

// 길찾기 (카카오모빌리티 자동차 길찾기). REST 키가 필요해서 서버가 대신 호출한다.
public interface RouteService {

	// 경로 { distance(m), duration(초), path: [[lat, lng], ...] }. 경로가 없으면 null.
	// 키가 없으면 IllegalStateException
	Map<String, Object> selectCarRoute(double originLat, double originLng, double destLat, double destLng);
}
