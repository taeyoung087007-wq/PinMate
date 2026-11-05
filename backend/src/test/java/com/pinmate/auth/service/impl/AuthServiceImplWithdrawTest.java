package com.pinmate.auth.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.auth.dao.AuthDAO;
import com.pinmate.team.service.TeamService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 탈퇴는 모임 나가기와 같은 규칙을 타고, 친구 관계·개인 장소까지 같은 트랜잭션에서 지운다 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplWithdrawTest {

    private static final Long ME = 9L;

    @Mock
    private AuthDAO authDAO;

    @Mock
    private TeamService teamService;

    @InjectMocks
    private AuthServiceImpl service;

    @Test
    @DisplayName("탈퇴하면 소속 모임마다 나가기를 호출하고 개인 기록을 지운다")
    void withdrawLeavesTeamsThenRemovesPrivateData() throws Exception {
        given(authDAO.countOwnedTeams(ME)).willReturn(0);
        given(authDAO.selectJoinedTeamIds(ME)).willReturn(List.of(7L, 13L));

        assertThat(service.withdrawUser(ME)).isTrue();

        InOrder order = inOrder(authDAO, teamService);
        order.verify(authDAO).selectJoinedTeamIds(ME);
        order.verify(teamService).leaveTeam(7L, ME);   // 재판정·알림 정리는 leaveTeam 이 담당
        order.verify(teamService).leaveTeam(13L, ME);
        order.verify(authDAO).deleteTeamMemberships(ME);
        order.verify(authDAO).deleteFriendships(ME);
        order.verify(authDAO).deletePersonalPlaces(ME);
        order.verify(authDAO).withdrawUser(ME);
    }

    @Test
    @DisplayName("모임장이면 탈퇴하지 않고 아무 것도 지우지 않는다")
    void ownerCannotWithdraw() throws Exception {
        given(authDAO.countOwnedTeams(ME)).willReturn(1);

        assertThat(service.withdrawUser(ME)).isFalse();

        verify(authDAO, never()).selectJoinedTeamIds(ME);
        verify(authDAO, never()).deleteFriendships(ME);
        verify(authDAO, never()).deletePersonalPlaces(ME);
        verify(authDAO, never()).withdrawUser(ME);
    }
}
