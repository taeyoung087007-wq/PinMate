package com.pinmate.place.service;

import com.pinmate.place.dto.PlaceResponse;

import java.util.List;

/**
 * 장소(상호명) 검색 서비스
 */
public interface PlaceService {

    /** 상호명으로 장소 검색 (지역 검색 API 프록시) */
    List<PlaceResponse> search(String query);

    /**
     * 좌표 주변에서 그 자리의 상가를 찾는다.
     * <p>
     * 지도 클릭 한 번에 여러 번 검색하던 것을 서버로 모은 것이다.
     * 프론트가 역지오코딩으로 얻은 주소 조각(area/building/road/roadNumber)을 넘기면,
     * 서버가 질의를 순서대로 시도하고 첫 번째로 맞는 상가를 돌려준다.
     *
     * @param lat        클릭한 위도
     * @param lng        클릭한 경도
     * @param tapMeters  손가락이 닿는 범위(미터). 줌에 따라 프론트가 계산해 넘긴다
     * @param area       동 이름 (예: "성수동2가")
     * @param building   건물명 (예: "대림창고"). 없으면 도로명으로만 찾는다
     * @param road       도로명 (예: "성수이로")
     * @param roadNumber 건물번호 (예: "78", "76-1")
     * @return 찾은 상가. 못 찾으면 null (프론트는 주소만 표시한다)
     */
    PlaceResponse findNearby(
            double lat,
            double lng,
            int tapMeters,
            String area,
            String building,
            String road,
            String roadNumber);
}
