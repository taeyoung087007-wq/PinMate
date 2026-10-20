package com.pinmate.place.dto;

/**
 * 장소(상호명) 검색 결과 한 건.
 * 좌표는 지역 검색 응답의 mapx(경도)·mapy(위도)를 WGS84 도 단위로 변환한 값이다.
 * 좌표를 못 얻은 경우 null 이며, 그때는 프론트가 주소로 지오코딩한다.
 */
public record PlaceResponse(
    String name,
    String category,
    String address,
    Double lat,
    Double lng
) {
}
