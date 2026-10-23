package com.pinmate.team.controller;

import jakarta.validation.Valid;
import com.pinmate.team.service.TeamService;

import com.pinmate.common.ApiResponse;
import com.pinmate.team.dto.CreateTeamRequest;
import com.pinmate.team.dto.JoinTeamRequest;
import com.pinmate.team.dto.TeamResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ApiResponse<List<TeamResponse>> getTeams(@SessionAttribute(name = "userId", required = false) Long userId) {
        return ApiResponse.ok(teamService.getTeams(requireUserId(userId)));
    }

    @GetMapping("/{teamId}")
    public ApiResponse<TeamResponse> getTeam(@PathVariable("teamId") Long teamId,
                                            @SessionAttribute(name = "userId", required = false) Long userId) {
        return ApiResponse.ok(teamService.getTeam(teamId, requireUserId(userId)));
    }

    @PostMapping
    public ApiResponse<TeamResponse> createTeam(@Valid @RequestBody CreateTeamRequest request,
                                               @SessionAttribute(name = "userId", required = false) Long userId) {
        return ApiResponse.ok(teamService.createTeam(request, requireUserId(userId)));
    }

    /** 로그인한 회원의 초대 코드 참여. 예: POST /api/teams/join {"code": "team13_0c009f"} */
    @PostMapping("/join")
    public ApiResponse<TeamResponse> joinTeam(@Valid @RequestBody JoinTeamRequest request,
                                             @SessionAttribute(name = "userId", required = false) Long userId) {
        return ApiResponse.ok(teamService.joinTeam(request, requireUserId(userId)));
    }

    private Long requireUserId(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userId;
    }
}
