package com.pinmate.pin.service;

import com.pinmate.pin.dto.CreatePinRequest;
import com.pinmate.pin.dto.PinResponse;
import com.pinmate.pin.dto.RecommendResponse;

import java.util.List;

/**
 * 장소(핀) 서비스
 */
public interface PinService {

    /** 팀의 핀 목록 조회 */
    List<PinResponse> getPins(Long teamId);

    /** 핀 단건 조회 */
    PinResponse getPin(Long placeId);

    /** 핀 등록 (등록자를 첫 추천인으로 등록) */
    PinResponse createPin(CreatePinRequest request);

    /** 추천 토글 (추천 ↔ 추천 취소) */
    RecommendResponse toggleRecommendation(Long placeId, String userIdentifier);

    /** 방문 토글 (방문 ↔ 방문 취소) */
    PinResponse toggleVisit(Long placeId, String userIdentifier);
}
