package com.pinmate.place.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 지도 클릭 시 "그 자리의 상가"를 고르는 판단 규칙.
 * 여기가 틀리면 엉뚱한 가게가 핀으로 등록되므로 회귀를 막아둔다.
 */
class PlaceServiceImplTest {

    @Test
    @DisplayName("도로명과 건물번호가 같으면 같은 주소로 본다")
    void sameRoadAddress() {
        assertThat(PlaceServiceImpl.isSameRoadAddress(
                "서울특별시 성동구 성수이로 78 1층", "성수이로", "78")).isTrue();
    }

    @Test
    @DisplayName("건물번호가 다르면 다른 주소로 본다 (78 vs 78-1)")
    void differentBuildingNumber() {
        assertThat(PlaceServiceImpl.isSameRoadAddress(
                "서울특별시 성동구 성수이로 78-1", "성수이로", "78")).isFalse();
    }

    @Test
    @DisplayName("도로명 앞에 다른 글자가 붙으면 다른 주소로 본다")
    void roadNameBoundary() {
        assertThat(PlaceServiceImpl.isSameRoadAddress(
                "서울특별시 성동구 신성수이로 78", "성수이로", "78")).isFalse();
    }

    @Test
    @DisplayName("비교할 값이 없으면 false")
    void nullSafe() {
        assertThat(PlaceServiceImpl.isSameRoadAddress(null, "성수이로", "78")).isFalse();
        assertThat(PlaceServiceImpl.isSameRoadAddress("서울특별시 성동구 성수이로 78", null, "78")).isFalse();
        assertThat(PlaceServiceImpl.isSameRoadAddress("서울특별시 성동구 성수이로 78", "성수이로", null)).isFalse();
        assertThat(PlaceServiceImpl.isSameRoadAddress("서울특별시 성동구 성수이로 78", "성수이로", " ")).isFalse();
    }
}
