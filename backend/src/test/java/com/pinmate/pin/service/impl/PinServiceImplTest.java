package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * 프론트 카테고리 키(food, drink ...)와 DB CHECK 값(restaurant, bar ...) 사이의 변환.
 * 한쪽만 바뀌면 핀이 엉뚱한 색으로 보이거나 저장이 실패하므로 왕복을 고정해둔다.
 */
class PinServiceImplTest {

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource({
            "food, restaurant",
            "cafe, cafe",
            "drink, bar",
            "stay, stay",
            "sight, attraction",
            "play, activity",
            "etc, etc"
    })
    @DisplayName("프론트 카테고리 키를 DB 값으로 바꾼다")
    void toDbCategory(String frontCategory, String dbCategory) {
        assertThat(PinServiceImpl.toDbCategory(frontCategory)).isEqualTo(dbCategory);
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource({
            "restaurant, food",
            "cafe, cafe",
            "bar, drink",
            "stay, stay",
            "attraction, sight",
            "activity, play",
            "etc, etc"
    })
    @DisplayName("DB 값을 프론트 카테고리 키로 되돌린다")
    void toFrontendCategory(String dbCategory, String frontCategory) {
        assertThat(PinServiceImpl.toFrontendCategory(dbCategory)).isEqualTo(frontCategory);
    }

    @Test
    @DisplayName("null 은 etc 로 본다")
    void nullBecomesEtc() {
        assertThat(PinServiceImpl.toDbCategory(null)).isEqualTo("etc");
        assertThat(PinServiceImpl.toFrontendCategory(null)).isEqualTo("etc");
    }

    @Test
    @DisplayName("모르는 값은 소문자로 정리해 그대로 둔다")
    void unknownCategoryIsNormalized() {
        assertThat(PinServiceImpl.toDbCategory("  ETC ")).isEqualTo("etc");
    }
}
