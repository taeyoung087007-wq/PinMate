package com.pinmate.place.service;

import java.util.List;
import java.util.Map;

// 장소(상호명) 검색. 결과 한 건: name, category, address, lat, lng (좌표를 못 얻으면 lat/lng 는 null)
public interface PlaceService {

	// 상호명으로 장소 검색 (지역 검색 API 프록시). 키가 없거나 호출에 실패하면 IllegalStateException(사용자 문구)
	List<Map<String, Object>> search(String query) throws Exception;

	/*
	 * 좌표 주변에서 그 자리의 상가를 찾는다. 못 찾으면 null (프론트는 주소만 표시한다)
	 * 프론트가 역지오코딩으로 얻은 주소 조각을 넘기면, 서버가 질의를 순서대로 시도하고 첫 번째로 맞는 상가를 돌려준다.
	 *   tapMeters  손가락이 닿는 범위(미터). 줌에 따라 프론트가 계산해 넘긴다
	 *   area       동 이름 (예: "성수동2가")
	 *   building   건물명 (예: "대림창고"). 없으면 도로명으로만 찾는다
	 *   road       도로명 (예: "성수이로")
	 *   roadNumber 건물번호 (예: "78", "76-1")
	 */
	Map<String, Object> selectNearby(double lat, double lng, int tapMeters,
	                                 String area, String building, String road, String roadNumber) throws Exception;
}
