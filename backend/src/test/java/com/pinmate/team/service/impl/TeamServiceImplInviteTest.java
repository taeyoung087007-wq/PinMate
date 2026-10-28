package com.pinmate.team.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.team.dao.TeamDAO;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 초대 링크 미리보기. teamId 는 다른 API 처럼 문자열로 내려준다 */
@ExtendWith(MockitoExtension.class)
class TeamServiceImplInviteTest {

    @Mock
    private TeamDAO teamDAO;

    @Mock
    private PresenceService presenceService;

    @Mock
    private PinService pinService;

    @InjectMocks
    private TeamServiceImpl service;

    @Test
    @DisplayName("초대 코드가 맞으면 teamId 를 문자열로, 없으면 null")
    void returnsTeamIdAsString() throws Exception {
        given(teamDAO.selectInviteByCode("team3_ab12cd")).willReturn(Map.of("team_id", 3L, "team_name", "충청바이브"));
        given(teamDAO.selectInviteByCode("wrong")).willReturn(null);

        assertThat(service.selectInvite("team3_ab12cd")).containsEntry("teamId", "3").containsEntry("teamName", "충청바이브");
        assertThat(service.selectInvite("wrong")).isNull();
    }
}
