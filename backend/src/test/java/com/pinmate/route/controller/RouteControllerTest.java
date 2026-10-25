package com.pinmate.route.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RouteControllerTest {

    @Test
    @DisplayName("자전거 시간은 시속 15km 기준 추정 (3km → 12분)")
    void bikeSecondsAt15kmh() {
        assertThat(RouteController.bikeSeconds(3000)).isEqualTo(720);
        assertThat(RouteController.bikeSeconds(0)).isZero();
    }
}
