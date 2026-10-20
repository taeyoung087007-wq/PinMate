package com.pinmate.place.service;

import com.pinmate.place.dto.PlaceResponse;

import java.util.List;

/**
 * 장소(상호명) 검색 서비스
 */
public interface PlaceService {

    /** 상호명으로 장소 검색 (지역 검색 API 프록시) */
    List<PlaceResponse> search(String query);
}
