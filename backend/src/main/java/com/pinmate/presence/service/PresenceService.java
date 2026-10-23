package com.pinmate.presence.service;

// 접속(온라인) 상태. 클라이언트가 주기적으로 heartbeat 를 보내고, 최근에 보낸 사용자를 온라인으로 본다.
public interface PresenceService {

	// 마지막 접속 시각 갱신 (userId 는 세션에서)
	void touch(Long userId);

	boolean isOnline(Long userId);
}
