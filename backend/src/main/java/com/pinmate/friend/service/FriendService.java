package com.pinmate.friend.service;

import java.util.List;
import java.util.Map;

// 친구 관계. 모든 메서드는 요청자(userId) 본인의 관계만 다룬다.
public interface FriendService {

	// 친구 목록 + 받은 요청 + 보낸 요청 + 받은 요청 수
	Map<String, Object> selectOverview(Long userId) throws Exception;

	// 아이디·닉네임으로 사용자 검색 (관계 상태 포함). 빈 검색어면 빈 목록
	List<Map<String, Object>> search(Long userId, String query) throws Exception;

	// 친구 요청. 상대가 먼저 보낸 요청이 있으면 바로 수락한다.
	// 결과: { status: pending | accepted | already } / 대상이 없으면 null
	Map<String, Object> sendRequest(Long userId, Long targetId) throws Exception;

	// 받은 요청 수락. 해당 요청이 없으면 false
	boolean accept(Long userId, Long requesterId) throws Exception;

	// 거절·요청 취소·끊기 (방향 무관). 관계가 없으면 false
	boolean remove(Long userId, Long otherId) throws Exception;

	// 친구가 공개한 개인 장소 (지도 오버레이). 친구가 아니면 null
	List<Map<String, Object>> selectFriendPlaces(Long userId, Long friendId) throws Exception;
}
