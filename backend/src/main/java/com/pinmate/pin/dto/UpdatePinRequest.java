package com.pinmate.pin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 핀 수정 요청. 주소·좌표는 바꾸지 않는다(위치를 옮기려면 새로 등록하는 편이 정확하다).
 * memo 는 등록자가 남긴 한 줄 추천평으로, recommendations.comment 에 저장된다.
 */
public record UpdatePinRequest(
    @NotBlank(message = "장소 이름을 입력해주세요.")
    @Size(max = 100, message = "장소 이름은 100자 이하로 입력해주세요.")
    String name,

    @Size(max = 20, message = "카테고리 값이 올바르지 않습니다.")
    String category,

    @Size(max = 100, message = "한 줄 추천평은 100자 이하로 입력해주세요.")
    String memo
) {}
