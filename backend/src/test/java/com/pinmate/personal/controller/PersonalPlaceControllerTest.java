package com.pinmate.personal.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PersonalPlaceControllerTest {

    @Test
    @DisplayName("카테고리는 프론트 키 7종과 빈 값만 받고, 나머지는 입력 오류로 거른다")
    void validatesCategory() {
        assertThat(PersonalPlaceController.isValidCategory("food")).isTrue();
        assertThat(PersonalPlaceController.isValidCategory("ETC")).isTrue();
        assertThat(PersonalPlaceController.isValidCategory("")).isTrue();
        assertThat(PersonalPlaceController.isValidCategory("pizza")).isFalse();
        assertThat(PersonalPlaceController.isValidCategory("restaurant")).isFalse();   // DB 값은 API 로 받지 않는다
    }
}
