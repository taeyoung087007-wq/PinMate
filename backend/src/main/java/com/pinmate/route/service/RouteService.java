package com.pinmate.route.service;

import java.util.Map;

// 길찾기. 자동차는 카카오모빌리티, 도보는 TMAP. 둘 다 서버 키가 필요해서 서버가 대신 호출한다.
public interface RouteService {

	// 경로 { distance(m), duration(초), path: [[lat, lng], ...] }. 경로가 없으면 null.
	// 키가 없으면 IllegalStateException
	Map<String, Object> selectCarRoute(double originLat, double originLng, double destLat, double destLng);

	// 도보 경로. 형식은 자동차와 같다
	Map<String, Object> selectWalkRoute(double originLat, double originLng, double destLat, double destLng);
}
