package com.pinmate.presence.dto;

import jakarta.validation.constraints.NotBlank;

public record HeartbeatRequest(
    @NotBlank(message = "사용자 정보가 없습니다.")
    String userId
) {}
