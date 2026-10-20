package com.pinmate.presence.service;

/**
 * 접속(온라인) 상태. 클라이언트가 주기적으로 heartbeat 를 보내고, 최근에 보낸 사용자를 온라인으로 본다.
 */
public interface PresenceService {

    /** userId 또는 loginId 로 사용자를 찾아 마지막 접속 시각을 갱신한다 (없는 사용자는 무시) */
    void touch(String userIdentifier);

    boolean isOnline(Long userId);
}
