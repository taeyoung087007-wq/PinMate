package com.pinmate.auth.service.impl;

import com.pinmate.team.dao.TeamDao;
import com.pinmate.auth.dao.UserDao;
import com.pinmate.team.domain.Team;
import com.pinmate.team.domain.TeamColors;
import com.pinmate.team.domain.TeamInvite;
import com.pinmate.team.domain.TeamMember;
import com.pinmate.auth.domain.User;
import com.pinmate.auth.dto.*;
import com.pinmate.auth.service.AuthService;
import com.pinmate.common.PasswordUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserDao userDao;
    private final TeamDao teamDao;

    /**
     * 초대 코드 유효성 검사
     */
    @Override
    public InviteCheckResponse checkInvite(String code) {
        if (code == null || code.trim().isBlank()) {
            return InviteCheckResponse.invalid("초대 코드를 입력해주세요.");
        }
        TeamInvite invite = teamDao.findInviteByCode(code.trim());
        if (invite == null) {
            return InviteCheckResponse.invalid("유효하지 않거나 만료된 초대 코드입니다.");
        }
        return InviteCheckResponse.success(invite.getTeamId(), invite.getTeamName());
    }

    /**
     * 신규 회원가입 및 팀 참여/생성
     */
    @Override
    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String loginId = req.loginId().trim();
        String nickname = req.nickname().trim();

        // 1. 중복 확인
        if (userDao.findByLoginId(loginId) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 아이디입니다.");
        }
        if (userDao.findByNickname(nickname) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 닉네임입니다.");
        }

        // 2. 초대코드 검증 (입력된 경우)
        TeamInvite invite = null;
        if (req.inviteCode() != null && !req.inviteCode().trim().isBlank()) {
            invite = teamDao.findInviteByCode(req.inviteCode().trim());
            if (invite == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 초대 코드입니다.");
            }
        }

        // 3. 사용자 등록
        User user = new User();
        user.setLoginId(loginId);
        user.setPasswordHash(PasswordUtil.hash(req.password()));
        user.setNickname(nickname);
        user.setEmail(req.email() != null && !req.email().trim().isBlank() ? req.email().trim() : loginId + "@pinmate.io");
        user.setStatus("active");
        userDao.insertUser(user);

        Long userId = user.getUserId();
        String assignedColor;
        Long targetTeamId;
        String targetTeamName;

        // 4. 팀 참여 또는 새 팀 생성
        if (invite != null) {
            targetTeamId = invite.getTeamId();
            targetTeamName = invite.getTeamName();
            assignedColor = allocateColorForTeam(targetTeamId);
            teamDao.insertTeamMember(targetTeamId, userId, "member", assignedColor);
            log.info("신규 사용자 {} (id={}) 가 초대코드 {} 를 통해 팀 {} 에 참여했습니다.", nickname, userId, req.inviteCode(), targetTeamName);
        } else {
            Team newTeam = new Team();
            newTeam.setName("📍 " + nickname + "의 첫 모임");
            teamDao.insertTeam(newTeam);
            targetTeamId = newTeam.getTeamId();
            targetTeamName = newTeam.getName();
            assignedColor = TeamColors.PALETTE.get(0);
            teamDao.insertTeamMember(targetTeamId, userId, "owner", assignedColor);

            // 해당 팀의 초대코드도 자동 생성
            String newInviteCode = "team" + targetTeamId + "_" + UUID.randomUUID().toString().substring(0, 6);
            teamDao.insertTeamInvite(targetTeamId, newInviteCode, userId);
            log.info("신규 사용자 {} (id={}) 가 새 팀 {} 을 생성했습니다.", nickname, userId, targetTeamName);
        }

        String initials = nickname.substring(0, 1);
        return new AuthResponse(
            String.valueOf(userId),
            loginId,
            nickname,
            user.getEmail(),
            assignedColor,
            initials,
            new AuthResponse.JoinedTeamDto(String.valueOf(targetTeamId), targetTeamName)
        );
    }

    /**
     * 로그인
     */
    @Override
    public AuthResponse login(LoginRequest req) {
        String identifier = req.loginId().trim();
        User user = userDao.findByIdOrLoginId(identifier);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // 비밀번호가 설정되지 않은 계정도 인증된 세션을 얻을 수 없게 한다.
        if (!PasswordUtil.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // 사용자의 팀 목록 조회
        List<Team> teams = teamDao.findTeamsByUserId(user.getUserId());
        String avatarColor = TeamColors.PALETTE.get(0);
        AuthResponse.JoinedTeamDto defaultTeam = null;

        if (!teams.isEmpty()) {
            Team firstTeam = teams.get(0);
            defaultTeam = new AuthResponse.JoinedTeamDto(String.valueOf(firstTeam.getTeamId()), firstTeam.getName());
            // 해당 팀 내 멤버 컬러 조회
            List<TeamMember> members = teamDao.findTeamMembersByTeamId(firstTeam.getTeamId());
            for (TeamMember m : members) {
                if (m.getUserId().equals(user.getUserId())) {
                    avatarColor = m.getColor();
                    break;
                }
            }
        }

        String initials = user.getNickname() != null && !user.getNickname().isEmpty()
            ? user.getNickname().substring(0, 1) : "P";

        return new AuthResponse(
            String.valueOf(user.getUserId()),
            user.getLoginId(),
            user.getNickname(),
            user.getEmail(),
            avatarColor,
            initials,
            defaultTeam
        );
    }

    /**
     * 팀 내에서 아직 사용되지 않은 색상을 할당
     */
    private String allocateColorForTeam(Long teamId) {
        return TeamColors.pickUnused(teamDao.findTeamMembersByTeamId(teamId));
    }
}
