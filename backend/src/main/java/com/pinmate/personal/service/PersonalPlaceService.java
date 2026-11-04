package com.pinmate.personal.service;

import java.util.List;
import java.util.Map;

// 개인 지도(내 지도) 장소. 모든 메서드는 요청자(userId) 본인의 장소만 다룬다.
// 다른 사람의 개인 장소는 없는 대상과 같이 null/NOT_FOUND 로 응답한다.
public interface PersonalPlaceService {

	// 내 개인 장소 목록 (최근 등록 순)
	List<Map<String, Object>> selectList(Long userId) throws Exception;

	// 개인 장소 등록. param: name, category, address, roadAddress, lat, lng, memo, source
	Map<String, Object> insert(Map<String, Object> param, Long userId) throws Exception;

	// 수정·삭제 가능 여부: SUCCESS(본인) / NOT_FOUND(없음) / NO_PERMISSION(남의 장소)
	String selectEditCode(Long personalPlaceId, Long userId) throws Exception;

	// 개인 장소 수정 (이름·카테고리·메모). 권한은 selectEditCode 로 먼저 확인한다
	Map<String, Object> update(Long personalPlaceId, Map<String, Object> param) throws Exception;

	// 공개/비공개 전환. 공개한 핀만 모임 지도에 오버레이된다. 권한은 selectEditCode 로 먼저 확인한다
	// 공개 범위 변경 (private / friends / team / all)
	Map<String, Object> updateVisibility(Long personalPlaceId, String visibility) throws Exception;

	// 개인 장소 삭제. 권한은 selectEditCode 로 먼저 확인한다
	void delete(Long personalPlaceId, Long userId) throws Exception;
}
