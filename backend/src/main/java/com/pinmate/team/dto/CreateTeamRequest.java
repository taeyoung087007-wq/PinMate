package com.pinmate.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 팀 생성 요청. userId 는 세션을 쓰므로 무시된다(하위 호환으로 필드만 유지). */
public record CreateTeamRequest(
    @NotBlank(message = "팀 이름을 입력해주세요.")
    @Size(max = 50, message = "팀 이름은 50자 이하로 입력해주세요.")
    String name,

    String userId
) {}
