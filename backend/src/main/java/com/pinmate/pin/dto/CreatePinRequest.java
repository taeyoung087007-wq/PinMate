package com.pinmate.pin.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 핀 등록 요청. 길이 제한은 DB 컬럼(places, recommendations.comment)과 맞춘다.
 * <p>
 * addedBy 는 더 이상 사용하지 않는다. 등록자는 로그인 세션의 userId 로 정해진다.
 * 프론트가 아직 값을 보내고 있어 필드는 남겨두지만(무시됨), 다음 정리 때 제거한다.
 */
public record CreatePinRequest(
    @NotBlank(message = "팀 ID가 필요합니다.")
    String teamId,

    @NotBlank(message = "장소 이름을 입력해주세요.")
    @Size(max = 100, message = "장소 이름은 100자 이하로 입력해주세요.")
    String name,

    @Size(max = 20, message = "카테고리 값이 올바르지 않습니다.")
    String category,

    @Size(max = 200, message = "주소는 200자 이하로 입력해주세요.")
    String address,

    @Size(max = 200, message = "도로명 주소는 200자 이하로 입력해주세요.")
    String roadAddress,

    @NotNull(message = "위도 값이 필요합니다.")
    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
    @DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
    Double lat,

    @NotNull(message = "경도 값이 필요합니다.")
    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
    @DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
    Double lng,

    String addedBy,

    @Size(max = 100, message = "한 줄 추천평은 100자 이하로 입력해주세요.")
    String memo
) {}
