package com.pinmate.pin.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PinControllerTest {

    @Test
    @DisplayName("카테고리는 프론트 키 7종과 빈 값만 받고, 나머지는 입력 오류로 거른다")
    void validatesCategory() {
        assertThat(PinController.isValidCategory("food")).isTrue();
        assertThat(PinController.isValidCategory("ETC")).isTrue();
        assertThat(PinController.isValidCategory("")).isTrue();
        assertThat(PinController.isValidCategory("pizza")).isFalse();
        assertThat(PinController.isValidCategory("restaurant")).isFalse();   // DB 값은 API 로 받지 않는다
    }
}
