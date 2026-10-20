package com.pinmate.team.service.impl;

import com.pinmate.team.dao.TeamDao;
import com.pinmate.auth.dao.UserDao;
import com.pinmate.team.domain.Team;
import com.pinmate.team.domain.TeamColors;
import com.pinmate.team.domain.TeamInvite;
import com.pinmate.team.domain.TeamMember;
import com.pinmate.auth.domain.User;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.team.dto.CreateTeamRequest;
import com.pinmate.team.dto.JoinTeamRequest;
import com.pinmate.team.dto.TeamMemberResponse;
import com.pinmate.team.dto.TeamResponse;
import com.pinmate.team.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamDao teamDao;
    private final UserDao userDao;
    private final PresenceService presenceService;

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

        // 회원가입으로 만든 첫 모임과 같은 형식의 초대 코드를 함께 발급한다
        String inviteCode = "team" + team.getTeamId() + "_" + UUID.randomUUID().toString().substring(0, 6);
        teamDao.insertTeamInvite(team.getTeamId(), inviteCode, userId);

        return getTeam(team.getTeamId());
    }

    @Override
    @Transactional
    public TeamResponse joinTeam(JoinTeamRequest req) {
        if (req.code() == null || req.code().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대 코드를 입력해주세요.");
        }
        // 다른 곳과 달리 기본 사용자(1번)로 대신하지 않는다. 엉뚱한 사람이 팀에 들어가면 안 되기 때문
        User user = req.userId() == null || req.userId().isBlank() ? null : userDao.findByIdOrLoginId(req.userId().trim());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가입한 계정으로 로그인한 뒤 참여할 수 있습니다.");
        }
        TeamInvite invite = teamDao.findInviteByCode(req.code().trim());
        if (invite == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 초대 코드입니다.");
        }

        List<TeamMember> members = teamDao.findTeamMembersByTeamId(invite.getTeamId());
        boolean alreadyMember = members.stream().anyMatch(m -> user.getUserId().equals(m.getUserId()));
        if (!alreadyMember) {
            teamDao.insertTeamMember(invite.getTeamId(), user.getUserId(), "member", TeamColors.pickUnused(members));
        }
        return getTeam(invite.getTeamId());
    }

    private TeamResponse toResponse(Team team) {
        List<TeamMember> members = teamDao.findTeamMembersByTeamId(team.getTeamId());
        List<TeamMemberResponse> memberResponses = members.stream()
            .map(m -> TeamMemberResponse.of(
                m.getLoginId() != null ? m.getLoginId() : String.valueOf(m.getUserId()),
                m.getNickname(),
                m.getColor(),
                m.getRole(),
                presenceService.isOnline(m.getUserId())
            ))
            .toList();

        return new TeamResponse(
            String.valueOf(team.getTeamId()),
            team.getName(),
            team.getInviteCode(),
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
