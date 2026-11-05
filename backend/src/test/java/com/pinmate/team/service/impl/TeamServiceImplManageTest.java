package com.pinmate.team.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.sync.service.SyncNotificationService;
import com.pinmate.team.dao.TeamDAO;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 초대 코드 형식·재발급(F-58)과 관리자 지정(F-54) */
@ExtendWith(MockitoExtension.class)
class TeamServiceImplManageTest {

    private static final Long TEAM_ID = 3L;
    private static final Long OWNER_ID = 1L;
    private static final Long ADMIN_ID = 2L;
    private static final Long MEMBER_ID = 4L;

    @Mock
    private TeamDAO teamDAO;

    @Mock
    private PresenceService presenceService;

    @Mock
    private PinService pinService;

    @Mock
    private SyncNotificationService syncNotificationService;

    @InjectMocks
    private TeamServiceImpl service;

    private static Map<String, Object> member(Long userId, String loginId, String role) {
        return Map.of("user_id", userId, "login_id", loginId, "role", role);
    }

    private void givenMembers() {
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(List.of(
                member(OWNER_ID, "minji01", "owner"),
                member(ADMIN_ID, "junho_k", "admin"),
                member(MEMBER_ID, "seoyeon", "member")));
    }

    @Test
    @DisplayName("초대 코드는 팀 ID 없이 헷갈리는 글자를 뺀 16자리 무작위 값이다")
    void inviteCodeIsRandom() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            String code = TeamServiceImpl.newInviteCode();
            assertThat(code).hasSize(16).matches("[a-hj-km-np-z2-9]+");
            codes.add(code);
        }
        assertThat(codes).hasSize(1000);
    }

    @Test
    @DisplayName("관리자는 초대 링크를 새로 만들 수 있고, 이전 코드는 먼저 회수된다")
    void adminReissuesInvite() throws Exception {
        givenMembers();

        assertThat(service.reissueInvite(TEAM_ID, ADMIN_ID)).isEqualTo(Constants.SUCCESS);

        InOrder order = inOrder(teamDAO);
        order.verify(teamDAO).lockTeam(TEAM_ID);
        order.verify(teamDAO).revokeTeamInvites(TEAM_ID);
        order.verify(teamDAO).insertTeamInvite(anyMap());
    }

    @Test
    @DisplayName("일반 멤버는 초대 링크를 새로 만들 수 없고, 멤버가 아니면 NOT_FOUND")
    void memberCannotReissue() throws Exception {
        givenMembers();

        assertThat(service.reissueInvite(TEAM_ID, MEMBER_ID)).isEqualTo(Constants.NO_PERMISSION);
        assertThat(service.reissueInvite(TEAM_ID, 99L)).isEqualTo(Constants.NOT_FOUND);
        verify(teamDAO, never()).revokeTeamInvites(anyLong());
        verify(teamDAO, never()).insertTeamInvite(anyMap());
    }

    @Test
    @DisplayName("모임장은 멤버를 관리자로 지정한다")
    void ownerPromotesMember() throws Exception {
        givenMembers();

        assertThat(service.updateMemberRole(TEAM_ID, OWNER_ID, "seoyeon", "admin")).isEqualTo(Constants.SUCCESS);
        verify(teamDAO).updateMemberRole(Map.of("teamId", TEAM_ID, "userId", MEMBER_ID, "role", "admin"));
    }

    @Test
    @DisplayName("모임장이 아니면 역할을 못 바꾸고, 모임장 자신의 역할도 바꿀 수 없다")
    void onlyOwnerChangesNonOwnerRoles() throws Exception {
        givenMembers();

        assertThat(service.updateMemberRole(TEAM_ID, ADMIN_ID, "seoyeon", "admin")).isEqualTo(Constants.NO_PERMISSION);
        assertThat(service.updateMemberRole(TEAM_ID, OWNER_ID, "minji01", "member")).isEqualTo(Constants.NO_PERMISSION);
        assertThat(service.updateMemberRole(TEAM_ID, OWNER_ID, "nobody", "admin")).isEqualTo(Constants.NOT_FOUND);
        assertThat(service.updateMemberRole(TEAM_ID, 99L, "seoyeon", "admin")).isEqualTo(Constants.NOT_FOUND);
        verify(teamDAO, never()).updateMemberRole(anyMap());
    }
}
