package com.pinmate.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 가입·비밀번호 변경 공통 규칙: 8자 이상, 영문과 숫자 포함, 72바이트 이하.
 */
class AuthControllerPasswordRuleTest {

    @Test
    @DisplayName("8자 이상 + 영문 + 숫자면 통과")
    void valid() {
        assertThat(AuthController.isValidPassword("abcd1234")).isTrue();
    }

    @Test
    @DisplayName("길이 부족, 숫자 없음, 영문 없음은 거절")
    void invalid() {
        assertThat(AuthController.isValidPassword("abc123")).isFalse();
        assertThat(AuthController.isValidPassword("abcdefgh")).isFalse();
        assertThat(AuthController.isValidPassword("12345678")).isFalse();
    }

    @Test
    @DisplayName("BCrypt 한도(72바이트) 초과는 거절")
    void tooLong() {
        assertThat(AuthController.isValidPassword("a1".repeat(37))).isFalse();
    }
}
