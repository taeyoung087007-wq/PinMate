package com.pinmate.controller;

import com.pinmate.service.TeamService;

import com.pinmate.common.ApiResponse;
import com.pinmate.dto.team.CreateTeamRequest;
import com.pinmate.dto.team.TeamResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ApiResponse<List<TeamResponse>> getTeams(@RequestParam(name = "userId", required = false) String userId) {
        return ApiResponse.ok(teamService.getTeams(userId));
    }

    @GetMapping("/{teamId}")
    public ApiResponse<TeamResponse> getTeam(@PathVariable("teamId") Long teamId) {
        return ApiResponse.ok(teamService.getTeam(teamId));
    }

    @PostMapping
    public ApiResponse<TeamResponse> createTeam(@RequestBody CreateTeamRequest request) {
        return ApiResponse.ok(teamService.createTeam(request));
    }
}
