package com.pinmate.controller;

import com.pinmate.service.PinService;

import com.pinmate.common.ApiResponse;
import com.pinmate.dto.pin.CreatePinRequest;
import com.pinmate.dto.pin.PinResponse;
import com.pinmate.dto.pin.RecommendResponse;
import com.pinmate.dto.pin.UserIdRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pins")
@RequiredArgsConstructor
public class PinController {

    private final PinService pinService;

    @GetMapping
    public ApiResponse<List<PinResponse>> getPins(@RequestParam("teamId") Long teamId) {
        return ApiResponse.ok(pinService.getPins(teamId));
    }

    @PostMapping
    public ApiResponse<PinResponse> createPin(@RequestBody CreatePinRequest request) {
        return ApiResponse.ok(pinService.createPin(request));
    }

    @PostMapping("/{pinId}/recommend")
    public ApiResponse<RecommendResponse> toggleRecommendation(
        @PathVariable("pinId") Long pinId,
        @RequestBody UserIdRequest request
    ) {
        return ApiResponse.ok(pinService.toggleRecommendation(pinId, request.userId()));
    }

    @PostMapping("/{pinId}/visit")
    public ApiResponse<PinResponse> toggleVisit(
        @PathVariable("pinId") Long pinId,
        @RequestBody UserIdRequest request
    ) {
        return ApiResponse.ok(pinService.toggleVisit(pinId, request.userId()));
    }
}
