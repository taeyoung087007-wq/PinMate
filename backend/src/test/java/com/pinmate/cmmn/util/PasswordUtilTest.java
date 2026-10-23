package com.pinmate.cmmn.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PasswordUtilTest {

    @Test
    @DisplayName("BCrypt 해시는 원문과 다르고 매번 다른 값이 나온다 (salt)")
    void hashIsSaltedBcrypt() {
        String first = PasswordUtil.hash("pinmate1234");

        assertThat(first).startsWith("$2").isNotEqualTo("pinmate1234");
        assertThat(PasswordUtil.hash("pinmate1234")).isNotEqualTo(first);
    }

    @Test
    @DisplayName("matches 는 원문과 해시가 맞으면 true, 다르면 false")
    void matches() {
        String hashed = PasswordUtil.hash("pinmate1234");

        assertThat(PasswordUtil.matches("pinmate1234", hashed)).isTrue();
        assertThat(PasswordUtil.matches("wrong-password", hashed)).isFalse();
    }

    @Test
    @DisplayName("null·빈 값·해시 없는 계정은 예외 없이 false")
    void matchesIsSafeForBlankInput() {
        assertThat(PasswordUtil.matches(null, "abc")).isFalse();
        assertThat(PasswordUtil.matches("", PasswordUtil.hash("x"))).isFalse();
        assertThat(PasswordUtil.matches("abc", null)).isFalse();
    }

    @Test
    @DisplayName("72바이트를 넘는 비밀번호는 받지 않는다 (BCrypt 입력 한도)")
    void rejectsOver72Bytes() {
        assertThat(PasswordUtil.fits("a".repeat(72))).isTrue();
        assertThat(PasswordUtil.fits("a".repeat(73))).isFalse();
        assertThat(PasswordUtil.fits("가".repeat(25))).isFalse(); // 한글 1자 = 3바이트
        assertThat(PasswordUtil.matches("a".repeat(73), PasswordUtil.hash("a".repeat(72)))).isFalse();
    }

    @Test
    @DisplayName("BCrypt 도입 전 SHA-256 해시도 검증되고, 전환 대상으로 표시된다")
    void legacySha256() throws Exception {
        String legacy = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest("oldpass1".getBytes(StandardCharsets.UTF_8)));

        assertThat(PasswordUtil.isLegacy(legacy)).isTrue();
        assertThat(PasswordUtil.matches("oldpass1", legacy)).isTrue();
        assertThat(PasswordUtil.matches("oldpass1", legacy.toUpperCase())).isTrue();
        assertThat(PasswordUtil.matches("wrong", legacy)).isFalse();
        assertThat(PasswordUtil.isLegacy(PasswordUtil.hash("oldpass1"))).isFalse();
    }
}
