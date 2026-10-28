package com.pinmate.team.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.team.dao.TeamDAO;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 모임 삭제(모임장만)와 나가기(모임장이면 넘기고, 마지막 한 명이면 모임 삭제) */
@ExtendWith(MockitoExtension.class)
class TeamServiceImplLeaveTest {

    private static final Long TEAM_ID = 3L;
    private static final Long OWNER_ID = 1L;
    private static final Long MEMBER_ID = 2L;

    @Mock
    private TeamDAO teamDAO;

    @Mock
    private PresenceService presenceService;

    @Mock
    private PinService pinService;

    @InjectMocks
    private TeamServiceImpl service;

    private static Map<String, Object> member(Long userId, String role) {
        return Map.of("user_id", userId, "role", role);
    }

    @Test
    @DisplayName("모임장만 모임을 삭제할 수 있다")
    void onlyOwnerDeletes() throws Exception {
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(List.of(member(OWNER_ID, "owner"), member(MEMBER_ID, "member")));

        assertThat(service.deleteTeam(TEAM_ID, MEMBER_ID)).isEqualTo(Constants.NO_PERMISSION);
        assertThat(service.deleteTeam(TEAM_ID, 99L)).isEqualTo(Constants.NOT_FOUND);
        verify(teamDAO, never()).deleteTeam(anyLong());

        assertThat(service.deleteTeam(TEAM_ID, OWNER_ID)).isEqualTo(Constants.SUCCESS);
        verify(teamDAO).deleteTeam(TEAM_ID);
    }

    @Test
    @DisplayName("모임장이 나가면 남은 사람 중 가장 먼저 들어온 멤버가 모임장이 된다")
    void ownerLeavePassesOwnership() throws Exception {
        given(teamDAO.selectTeamMembers(TEAM_ID))
                .willReturn(List.of(member(OWNER_ID, "owner"), member(MEMBER_ID, "member")))
                .willReturn(List.of(member(MEMBER_ID, "member")));

        assertThat(service.leaveTeam(TEAM_ID, OWNER_ID)).isEqualTo(Constants.SUCCESS);
        verify(teamDAO).updateOldestMemberToOwner(TEAM_ID);
        verify(teamDAO, never()).deleteTeam(anyLong());
        verify(pinService).updateTeamConsensus(TEAM_ID);
    }

    @Test
    @DisplayName("멤버가 나가면 모임장은 그대로")
    void memberLeaveKeepsOwner() throws Exception {
        given(teamDAO.selectTeamMembers(TEAM_ID))
                .willReturn(List.of(member(OWNER_ID, "owner"), member(MEMBER_ID, "member")))
                .willReturn(List.of(member(OWNER_ID, "owner")));

        assertThat(service.leaveTeam(TEAM_ID, MEMBER_ID)).isEqualTo(Constants.SUCCESS);
        verify(teamDAO, never()).updateOldestMemberToOwner(anyLong());
    }

    @Test
    @DisplayName("마지막 한 명이 나가면 모임을 지운다")
    void lastMemberLeaveDeletesTeam() throws Exception {
        given(teamDAO.selectTeamMembers(TEAM_ID))
                .willReturn(List.of(member(OWNER_ID, "owner")))
                .willReturn(List.of());

        assertThat(service.leaveTeam(TEAM_ID, OWNER_ID)).isEqualTo(Constants.SUCCESS);
        verify(teamDAO).deleteTeam(TEAM_ID);
    }
}
