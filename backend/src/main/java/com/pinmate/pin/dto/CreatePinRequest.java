package com.pinmate.pin.dto;

/**
 * 핀 등록 요청.
 * <p>
 * addedBy 는 더 이상 사용하지 않는다. 등록자는 로그인 세션의 userId 로 정해진다.
 * 프론트가 아직 값을 보내고 있어 필드는 남겨두지만(무시됨), 다음 정리 때 제거한다.
 */
public record CreatePinRequest(
    String teamId,
    String name,
    String category,
    String address,
    String roadAddress,
    Double lat,
    Double lng,
    String addedBy,
    String memo
) {}
