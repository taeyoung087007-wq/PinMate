package com.pinmate.presence.service.impl;

import com.pinmate.auth.dao.UserDao;
import com.pinmate.auth.domain.User;
import com.pinmate.presence.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {

    // 클라이언트 heartbeat 주기(30초)의 3배. 한두 번 놓쳐도 바로 오프라인이 되지 않게 한다
    private static final Duration ONLINE_WINDOW = Duration.ofSeconds(90);

    private final UserDao userDao;

    // shortcut: 서버 메모리에만 두므로 재시작하면 모두 오프라인이 되고 서버가 2대 이상이면 맞지 않는다. 다중 서버가 되면 Redis 등으로 옮긴다
    private final Map<Long, Instant> lastSeen = new ConcurrentHashMap<>();

    @Override
    public void touch(String userIdentifier) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            return;
        }
        User user = userDao.findByIdOrLoginId(userIdentifier.trim());
        if (user != null) {
            lastSeen.put(user.getUserId(), Instant.now());
        }
    }

    @Override
    public boolean isOnline(Long userId) {
        Instant seen = userId == null ? null : lastSeen.get(userId);
        return seen != null && seen.isAfter(Instant.now().minus(ONLINE_WINDOW));
    }
}
