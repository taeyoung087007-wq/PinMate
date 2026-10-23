package com.pinmate.pin.controller;

import jakarta.validation.Valid;
import com.pinmate.pin.service.PinService;

import com.pinmate.common.ApiResponse;
import com.pinmate.pin.dto.CreatePinRequest;
import com.pinmate.pin.dto.PinResponse;
import com.pinmate.pin.dto.RecommendResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 장소(핀) API.
 * <p>
 * 사용자 식별은 본문이 아니라 로그인 세션에서 가져온다.
 * 예전에는 addedBy / userId 를 클라이언트가 보낸 값을 그대로 썼는데,
 * 아무 값이나 넣어도 통과해서 남의 계정으로 등록·추천을 할 수 있었다.
 * 팀 API(TeamController)와 같은 방식으로 맞춘다.
 */
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
    public ApiResponse<PinResponse> createPin(
        @Valid @RequestBody CreatePinRequest request,
        @SessionAttribute(name = "userId", required = false) Long userId
    ) {
        return ApiResponse.ok(pinService.createPin(request, requireUserId(userId)));
    }

    @PostMapping("/{pinId}/recommend")
    public ApiResponse<RecommendResponse> toggleRecommendation(
        @PathVariable("pinId") Long pinId,
        @SessionAttribute(name = "userId", required = false) Long userId
    ) {
        return ApiResponse.ok(pinService.toggleRecommendation(pinId, requireUserId(userId)));
    }

    @PostMapping("/{pinId}/visit")
    public ApiResponse<PinResponse> toggleVisit(
        @PathVariable("pinId") Long pinId,
        @SessionAttribute(name = "userId", required = false) Long userId
    ) {
        return ApiResponse.ok(pinService.toggleVisit(pinId, requireUserId(userId)));
    }

    /** 세션이 없으면 401. 프론트는 이 응답을 받으면 로그인 화면으로 보낸다 */
    private Long requireUserId(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userId;
    }
}
