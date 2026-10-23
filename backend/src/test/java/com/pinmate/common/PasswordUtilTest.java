package com.pinmate.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PasswordUtilTest {

    @Test
    @DisplayName("같은 비밀번호는 항상 같은 해시를 만든다")
    void hashIsDeterministic() {
        assertThat(PasswordUtil.hash("pinmate1234"))
                .isEqualTo(PasswordUtil.hash("pinmate1234"));
    }

    @Test
    @DisplayName("해시는 원문과 다르고 64자리 16진수다")
    void hashHidesRawPassword() {
        String hashed = PasswordUtil.hash("pinmate1234");

        assertThat(hashed)
                .isNotEqualTo("pinmate1234")
                .hasSize(64)
                .matches("[0-9a-f]{64}");
    }

    @Test
    @DisplayName("matches 는 원문과 해시가 맞으면 true")
    void matchesReturnsTrue() {
        assertThat(PasswordUtil.matches("pinmate1234", PasswordUtil.hash("pinmate1234"))).isTrue();
    }

    @Test
    @DisplayName("matches 는 다른 비밀번호면 false")
    void matchesReturnsFalseForWrongPassword() {
        assertThat(PasswordUtil.matches("wrong-password", PasswordUtil.hash("pinmate1234"))).isFalse();
    }

    @Test
    @DisplayName("빈 값이나 null 은 해시하지 않는다")
    void blankInputIsNotHashed() {
        assertThat(PasswordUtil.hash(null)).isNull();
        assertThat(PasswordUtil.hash("   ")).isNull();
    }

    @Test
    @DisplayName("null 이나 공백으로는 검증이 통과하지 않는다")
    void matchesIsSafeForBlankInput() {
        assertThat(PasswordUtil.matches(null, "abc")).isFalse();
        assertThat(PasswordUtil.matches("abc", null)).isFalse();
        // 공백만 있는 비밀번호로도 예외 없이 false 여야 한다 (예전에는 NPE 가 났다)
        assertThat(PasswordUtil.matches("   ", "abc")).isFalse();
    }
}
