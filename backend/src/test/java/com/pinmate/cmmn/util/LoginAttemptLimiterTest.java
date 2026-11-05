package com.pinmate.cmmn.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 로그인 시도 제한: 계정별 5회 + IP 전체 30회(아이디만 바꿔 대입하는 공격 차단) */
class LoginAttemptLimiterTest {

    private static final String IP = "1.2.3.4";
    private static final String IP_KEY = LoginAttemptLimiter.loginIpKey(IP);

    private LoginAttemptLimiter limiter() {
        return new LoginAttemptLimiter(() -> 0L, 10_000);
    }

    @Test
    @DisplayName("계정 하나는 5번까지만 통과한다")
    void accountCapIsFive() {
        LoginAttemptLimiter limiter = limiter();
        String key = "login|admin|" + IP;

        for (int i = 0; i < LoginAttemptLimiter.MAX_ATTEMPTS; i++) {
            assertThat(limiter.tryAcquire(key)).isTrue();
        }
        assertThat(limiter.tryAcquire(key)).isFalse();
    }

    @Test
    @DisplayName("아이디를 바꿔 가며 30번 시도하면 IP 한도에 걸린다")
    void ipCapBlocksAccountSpraying() {
        LoginAttemptLimiter limiter = limiter();

        for (int i = 0; i < LoginAttemptLimiter.IP_MAX_ATTEMPTS; i++) {
            assertThat(limiter.tryAcquire(IP_KEY, LoginAttemptLimiter.IP_MAX_ATTEMPTS)).isTrue();
            assertThat(limiter.tryAcquire("login|user" + i + "|" + IP)).isTrue();   // 계정 키는 매번 달라도
        }
        assertThat(limiter.tryAcquire(IP_KEY, LoginAttemptLimiter.IP_MAX_ATTEMPTS)).isFalse();
        assertThat(limiter.tryAcquire("login|another|" + IP)).isTrue();   // 계정 한도 자체는 별개
    }

    @Test
    @DisplayName("성공해서 reset 하면 IP 한도도 풀린다")
    void resetClearsIpCap() {
        LoginAttemptLimiter limiter = limiter();
        for (int i = 0; i < LoginAttemptLimiter.IP_MAX_ATTEMPTS; i++) {
            limiter.tryAcquire(IP_KEY, LoginAttemptLimiter.IP_MAX_ATTEMPTS);
        }

        limiter.reset(IP_KEY);

        assertThat(limiter.tryAcquire(IP_KEY, LoginAttemptLimiter.IP_MAX_ATTEMPTS)).isTrue();
    }
}
