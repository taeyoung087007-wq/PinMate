package com.pinmate.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 초대 코드로 팀 참여. userId 는 세션을 쓰므로 무시된다(하위 호환으로 필드만 유지). */
public record JoinTeamRequest(
    @NotBlank(message = "초대 코드를 입력해주세요.")
    @Size(max = 32, message = "초대 코드가 올바르지 않습니다.")
    String code,

    String userId
) {}
