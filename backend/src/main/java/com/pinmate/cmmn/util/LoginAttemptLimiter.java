package com.pinmate.cmmn.util;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

// 로그인·가입 코드·팀 초대 코드 시도 제한. 같은 키로 5번 시도하면 5분 차단(성공하면 reset). 메모리에만 둔다(단일 서버).
// 시도 확인과 증가를 한 번에 해서, 동시에 몰려온 요청도 5번까지만 통과한다.
@Component
public class LoginAttemptLimiter {

	static final int MAX_ATTEMPTS = 5;
	static final long BLOCK_MILLIS = 5 * 60 * 1000L;
	private static final int DEFAULT_MAX_KEYS = 10_000; // 키 개수 상한(메모리 소모 공격 방지)

	private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
	private final LongSupplier clock;
	private final int maxKeys;

	public LoginAttemptLimiter() {
		this(System::currentTimeMillis, DEFAULT_MAX_KEYS);
	}

	LoginAttemptLimiter(LongSupplier clock, int maxKeys) {
		this.clock = clock;
		this.maxKeys = maxKeys;
	}

	// 시도해도 되면 true(시도 1회를 센다), 차단 중이면 false.
	// 키가 상한만큼 차 있고 오래된 것을 정리해도 자리가 없으면 새 키는 false(막는 쪽으로 실패).
	public boolean tryAcquire(String key) {
		long now = clock.getAsLong();
		if (!attempts.containsKey(key) && attempts.size() >= maxKeys) {
			attempts.values().removeIf(a -> isStale(a, now));
			if (attempts.size() >= maxKeys) {
				return false;
			}
		}

		boolean[] allowed = {false};
		attempts.compute(key, (k, attempt) -> {
			if (attempt != null && attempt.blockedUntil > now) {
				return attempt; // 차단 중: 세지 않고 거절
			}
			if (attempt == null || attempt.blockedUntil != 0 || attempt.lastAttempt + BLOCK_MILLIS < now) {
				attempt = new Attempt(); // 처음이거나, 차단이 끝났거나, 마지막 시도가 오래됨
			}
			attempt.count++;
			attempt.lastAttempt = now;
			if (attempt.count >= MAX_ATTEMPTS) {
				attempt.blockedUntil = now + BLOCK_MILLIS;
			}
			allowed[0] = true;
			return attempt;
		});
		return allowed[0];
	}

	// 가입 코드 시도 키
	public static String signupKey(String ip) {
		return "signup|" + ip;
	}

	// 팀 초대 코드 시도 키. 코드 확인과 참여가 같은 키를 써서, 경로를 바꿔 가며 코드를 추측할 수 없게 한다
	public static String inviteKey(String ip) {
		return "invite|" + ip;
	}

	public void reset(String key) {
		attempts.remove(key);
	}

	private static boolean isStale(Attempt attempt, long now) {
		return attempt.lastAttempt + BLOCK_MILLIS < now && attempt.blockedUntil <= now;
	}

	private static final class Attempt {
		int count;
		long lastAttempt;
		long blockedUntil;
	}
}
