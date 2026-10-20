package com.pinmate.presence.controller;

import com.pinmate.common.ApiResponse;
import com.pinmate.presence.dto.HeartbeatRequest;
import com.pinmate.presence.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 접속 상태 갱신. 예: POST /api/presence/heartbeat {"userId": "3"}
 */
@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/heartbeat")
    public ApiResponse<Void> heartbeat(@RequestBody HeartbeatRequest request) {
        presenceService.touch(request.userId());
        return ApiResponse.ok(null);
    }
}
