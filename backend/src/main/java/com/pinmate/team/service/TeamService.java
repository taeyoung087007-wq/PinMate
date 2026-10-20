package com.pinmate.team.service;

import com.pinmate.team.dto.CreateTeamRequest;
import com.pinmate.team.dto.JoinTeamRequest;
import com.pinmate.team.dto.TeamResponse;

import java.util.List;

/**
 * 팀 서비스
 */
public interface TeamService {

    /** 사용자가 속한 팀 목록 조회 */
    List<TeamResponse> getTeams(Long userId);

    /** 참여 중인 팀 단건 조회 */
    TeamResponse getTeam(Long teamId, Long userId);

    /** 팀 생성 (생성자를 owner로 등록) */
    TeamResponse createTeam(CreateTeamRequest request, Long userId);

    /** 초대 코드로 기존 회원이 팀에 참여 (이미 멤버면 그대로 팀 정보를 돌려준다) */
    TeamResponse joinTeam(JoinTeamRequest request, Long userId);
}
