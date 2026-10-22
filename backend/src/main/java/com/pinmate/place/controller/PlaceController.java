package com.pinmate.place.controller;

import com.pinmate.common.ApiResponse;
import com.pinmate.place.dto.PlaceResponse;
import com.pinmate.place.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 장소(상호명) 검색. 예: GET /api/places/search?query=대림창고
 */
@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    @GetMapping("/search")
    public ApiResponse<List<PlaceResponse>> search(@RequestParam("query") String query) {
        if (query.isBlank()) {
            return ApiResponse.ok(List.of());
        }
        return ApiResponse.ok(placeService.search(query.trim()));
    }

    /**
     * 지도에서 누른 좌표 주변의 상가를 찾는다.
     * <p>
     * 프론트는 역지오코딩으로 얻은 주소 조각만 넘기고, 검색은 서버가 대신 한다.
     * 클릭 한 번에 브라우저가 10번 넘게 호출하던 것을 이 엔드포인트 하나로 모은 것이다.
     * 찾지 못하면 data 가 null 로 내려가고, 프론트는 주소만 표시한다.
     */
    @GetMapping("/nearby")
    public ApiResponse<PlaceResponse> nearby(
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng,
            @RequestParam(name = "tapMeters", defaultValue = "30") int tapMeters,
            @RequestParam(name = "area", required = false) String area,
            @RequestParam(name = "building", required = false) String building,
            @RequestParam(name = "road", required = false) String road,
            @RequestParam(name = "roadNumber", required = false) String roadNumber) {
        return ApiResponse.ok(
                placeService.findNearby(lat, lng, tapMeters, area, building, road, roadNumber));
    }
}
