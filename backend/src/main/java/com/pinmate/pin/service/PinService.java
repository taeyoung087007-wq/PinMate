package com.pinmate.pin.service;

import java.util.List;
import java.util.Map;

// 모든 메서드는 요청자(userId)가 그 팀의 멤버인지 확인한다. 멤버가 아니면 없는 대상과 같이 null 을 돌려준다
public interface PinService {

	// 팀의 핀 목록
	List<Map<String, Object>> selectPinList(Long teamId, Long userId) throws Exception;

	// 핀 등록 (등록자를 첫 추천인으로 등록). param: teamId, name, category, address, roadAddress, lat, lng, memo
	Map<String, Object> insertPin(Map<String, Object> param, Long userId) throws Exception;

	// 추천 토글 (추천 ↔ 추천 취소). 결과: pin, reachedAllApproved
	Map<String, Object> toggleRecommendation(Long placeId, Long userId) throws Exception;

	// 방문 토글 (방문 ↔ 방문 취소)
	Map<String, Object> toggleVisit(Long placeId, Long userId) throws Exception;
}
