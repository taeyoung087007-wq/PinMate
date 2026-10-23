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

	// 팀원 수가 바뀐 뒤 그 팀 핀들의 '모두 인정'을 다시 판정한다. 풀린 핀은 'N명일 때 달성' 기록을 남긴다
	void updateTeamConsensus(Long teamId) throws Exception;

	// 수정·삭제 가능 여부: SUCCESS(등록자 또는 팀 owner) / NO_PERMISSION / NOT_FOUND(없거나 팀 멤버가 아님)
	String selectEditCode(Long placeId, Long userId) throws Exception;

	// 핀 수정 (이름·카테고리·등록자 추천평). 권한은 selectEditCode 로 먼저 확인한다. param: name, category, memo
	Map<String, Object> updatePin(Long placeId, Map<String, Object> param) throws Exception;

	// 핀 삭제 (추천·방문 기록도 함께). 권한은 selectEditCode 로 먼저 확인한다
	void deletePin(Long placeId) throws Exception;
}
