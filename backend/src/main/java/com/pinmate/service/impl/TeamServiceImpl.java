package com.pinmate.service.impl;

import com.pinmate.dao.TeamDao;
import com.pinmate.dao.UserDao;
import com.pinmate.domain.Team;
import com.pinmate.domain.TeamMember;
import com.pinmate.domain.User;
import com.pinmate.dto.team.CreateTeamRequest;
import com.pinmate.dto.team.TeamMemberResponse;
import com.pinmate.dto.team.TeamResponse;
import com.pinmate.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamDao teamDao;
    private final UserDao userDao;

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponse> getTeams(String userIdentifier) {
        Long userId = resolveUserId(userIdentifier);
        List<Team> teams = teamDao.findTeamsByUserId(userId);
        return teams.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId) {
        Team team = teamDao.findTeamById(teamId);
        if (team == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "팀을 찾을 수 없습니다.");
        }
        return toResponse(team);
    }

    @Override
    @Transactional
    public TeamResponse createTeam(CreateTeamRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀 이름을 입력해주세요.");
        }

        Long userId = resolveUserId(req.userId());

        Team team = new Team();
        team.setName(req.name().trim());
        teamDao.insertTeam(team);

        // 생성자를 owner로 등록 (기본 보라색 계열 아바타)
        teamDao.insertTeamMember(team.getTeamId(), userId, "owner", "#6C63FF");

        return getTeam(team.getTeamId());
    }

    private TeamResponse toResponse(Team team) {
        List<TeamMember> members = teamDao.findTeamMembersByTeamId(team.getTeamId());
        List<TeamMemberResponse> memberResponses = members.stream()
            .map(m -> TeamMemberResponse.of(
                m.getLoginId() != null ? m.getLoginId() : String.valueOf(m.getUserId()),
                m.getNickname(),
                m.getColor(),
                m.getRole()
            ))
            .toList();

        return new TeamResponse(
            String.valueOf(team.getTeamId()),
            team.getName(),
            team.getAllApprovedCount(),
            team.getPinCount(),
            members.size(),
            memberResponses
        );
    }

    private Long resolveUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return 1L; // 기본 사용자
        }
        User user = userDao.findByIdOrLoginId(identifier.trim());
        if (user != null) {
            return user.getUserId();
        }
        // 숫자면 직접 파싱
        try {
            return Long.parseLong(identifier.trim());
        } catch (NumberFormatException ignored) {
            return 1L;
        }
    }
}
