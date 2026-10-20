package com.pinmate.team.service;

import com.pinmate.team.dto.CreateTeamRequest;
import com.pinmate.team.dto.TeamResponse;

import java.util.List;

/**
 * 팀 서비스
 */
public interface TeamService {

    /** 사용자가 속한 팀 목록 조회 */
    List<TeamResponse> getTeams(String userIdentifier);

    /** 팀 단건 조회 */
    TeamResponse getTeam(Long teamId);

    /** 팀 생성 (생성자를 owner로 등록) */
    TeamResponse createTeam(CreateTeamRequest request);
}
