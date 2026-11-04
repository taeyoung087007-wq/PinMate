package com.pinmate.sync.service;

import java.util.Map;

// 팀 장소의 추가·삭제를 내 지도에 반영할지 알려주는 알림 (F-71, F-72)
public interface SyncNotificationService {

	// 팀에 새 장소가 생겼을 때: 행위자를 뺀 팀원 전원에게 '추가' 알림
	void notifyPinAdded(Long teamId, Long actorId, Map<String, Object> pin) throws Exception;

	// 팀 장소가 지워졌을 때: 그 장소를 내 지도에 가진 팀원에게 '삭제' 알림. 처리 안 한 '추가' 알림은 정리한다
	void notifyPinDeleted(Long teamId, Long actorId, Map<String, Object> pin) throws Exception;

	// 알림 목록 + 처리 안 한 개수
	Map<String, Object> selectOverview(Long userId) throws Exception;

	// 처리 안 한 알림 수 (배지)
	int countPending(Long userId) throws Exception;

	// 알림 반영: '추가'면 내 지도에 담기, '삭제'면 내 지도에서 지우기. SUCCESS / NOT_FOUND
	String apply(Long notificationId, Long userId) throws Exception;

	// 알림 무시: SUCCESS / NOT_FOUND
	String ignore(Long notificationId, Long userId) throws Exception;

	// 팀의 처리 안 한 알림 모두 반영 / 모두 무시
	String applyAll(Long teamId, Long userId) throws Exception;

	String ignoreAll(Long teamId, Long userId) throws Exception;
}
