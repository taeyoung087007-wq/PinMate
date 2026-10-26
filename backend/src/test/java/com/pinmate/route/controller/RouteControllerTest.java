package com.pinmate.route.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

class RouteControllerTest {

    @Test
    @DisplayName("자전거 시간은 시속 15km 기준 추정 (3km → 12분)")
    void bikeSecondsAt15kmh() {
        assertThat(RouteController.bikeSeconds(3000)).isEqualTo(720);
        assertThat(RouteController.bikeSeconds(0)).isZero();
    }

    @Test
    @DisplayName("TMAP 3102(걷는 길이 이어지지 않음)만 경로 없음으로, 다른 400·네트워크 오류는 아님 (실제 응답 형식)")
    void detectsWalkUnreachable() {
        String body = "{ \"error\":{ \"id\":\"400\", \"category\":\"tmap\", \"code\":\"3102\", \"message\":\"해당 서비스가 지원되지 않는 구간입니다.\" }}";
        assertThat(RouteController.isWalkUnreachable(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null,
                body.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8))).isTrue();
        assertThat(RouteController.isWalkUnreachable(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null,
                body.replace("3102", "1100").getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8))).isFalse();
        assertThat(RouteController.isWalkUnreachable(new ResourceAccessException("timeout"))).isFalse();
    }
}
