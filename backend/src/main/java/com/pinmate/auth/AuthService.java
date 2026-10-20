package com.pinmate.auth;

import com.pinmate.auth.dto.*;
import com.pinmate.team.Team;
import com.pinmate.team.TeamInvite;
import com.pinmate.team.TeamMapper;
import com.pinmate.team.TeamMember;
import com.pinmate.user.User;
import com.pinmate.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final List<String> COLOR_PALETTE = List.of(
        "#6C63FF", "#FF6B6B", "#4CC9F0", "#06D6A0", "#FFD166",
        "#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4895EF"
    );

    private final UserMapper userMapper;
    private final TeamMapper teamMapper;

    /**
     * 초대 코드 유효성 검사
     */
    public InviteCheckResponse checkInvite(String code) {
        if (code == null || code.trim().isBlank()) {
            return InviteCheckResponse.invalid("초대 코드를 입력해주세요.");
        }
        TeamInvite invite = teamMapper.findInviteByCode(code.trim());
        if (invite == null) {
            return InviteCheckResponse.invalid("유효하지 않거나 만료된 초대 코드입니다.");
        }
        return InviteCheckResponse.success(invite.getTeamId(), invite.getTeamName());
    }

    /**
     * 신규 회원가입 및 팀 참여/생성
     */
    @Transactional
    public AuthResponse signup(SignupRequest req) {
        if (req.loginId() == null || req.loginId().trim().length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 3자 이상 입력해주세요.");
        }
        if (req.password() == null || req.password().length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 4자 이상 입력해주세요.");
        }
        if (req.nickname() == null || req.nickname().trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임은 2자 이상 입력해주세요.");
        }

        String loginId = req.loginId().trim();
        String nickname = req.nickname().trim();

        // 1. 중복 확인
        if (userMapper.findByLoginId(loginId) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 아이디입니다.");
        }
        if (userMapper.findByNickname(nickname) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 닉네임입니다.");
        }

        // 2. 초대코드 검증 (입력된 경우)
        TeamInvite invite = null;
        if (req.inviteCode() != null && !req.inviteCode().trim().isBlank()) {
            invite = teamMapper.findInviteByCode(req.inviteCode().trim());
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
        userMapper.insertUser(user);

        Long userId = user.getUserId();
        String assignedColor;
        Long targetTeamId;
        String targetTeamName;

        // 4. 팀 참여 또는 새 팀 생성
        if (invite != null) {
            targetTeamId = invite.getTeamId();
            targetTeamName = invite.getTeamName();
            assignedColor = allocateColorForTeam(targetTeamId);
            teamMapper.insertTeamMember(targetTeamId, userId, "member", assignedColor);
            log.info("신규 사용자 {} (id={}) 가 초대코드 {} 를 통해 팀 {} 에 참여했습니다.", nickname, userId, req.inviteCode(), targetTeamName);
        } else {
            Team newTeam = new Team();
            newTeam.setName("📍 " + nickname + "의 첫 모임");
            teamMapper.insertTeam(newTeam);
            targetTeamId = newTeam.getTeamId();
            targetTeamName = newTeam.getName();
            assignedColor = COLOR_PALETTE.get(0);
            teamMapper.insertTeamMember(targetTeamId, userId, "owner", assignedColor);

            // 해당 팀의 초대코드도 자동 생성
            String newInviteCode = "team" + targetTeamId + "_" + UUID.randomUUID().toString().substring(0, 6);
            teamMapper.insertTeamInvite(targetTeamId, newInviteCode, userId);
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
    public AuthResponse login(LoginRequest req) {
        if (req.loginId() == null || req.loginId().trim().isBlank() || req.password() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디와 비밀번호를 입력해주세요.");
        }

        String identifier = req.loginId().trim();
        User user = userMapper.findByIdOrLoginId(identifier);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // 비밀번호 확인 (단, 비밀번호 해시가 비어있는 초기 시드 유저는 테스트 편의상 통과 허용)
        if (user.getPasswordHash() != null && !PasswordUtil.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        // 사용자의 팀 목록 조회
        List<Team> teams = teamMapper.findTeamsByUserId(user.getUserId());
        String avatarColor = COLOR_PALETTE.get(0);
        AuthResponse.JoinedTeamDto defaultTeam = null;

        if (!teams.isEmpty()) {
            Team firstTeam = teams.get(0);
            defaultTeam = new AuthResponse.JoinedTeamDto(String.valueOf(firstTeam.getTeamId()), firstTeam.getName());
            // 해당 팀 내 멤버 컬러 조회
            List<TeamMember> members = teamMapper.findTeamMembersByTeamId(firstTeam.getTeamId());
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
        List<TeamMember> members = teamMapper.findTeamMembersByTeamId(teamId);
        Set<String> used = members.stream()
            .map(TeamMember::getColor)
            .collect(Collectors.toSet());

        for (String c : COLOR_PALETTE) {
            if (!used.contains(c)) {
                return c;
            }
        }
        return String.format("#%06X", (int) (Math.random() * 0xFFFFFF));
    }
}
