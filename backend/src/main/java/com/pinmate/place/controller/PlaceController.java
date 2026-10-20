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
}
