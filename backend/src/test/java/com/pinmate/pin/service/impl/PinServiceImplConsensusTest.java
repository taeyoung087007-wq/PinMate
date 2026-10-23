package com.pinmate.pin.service.impl;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.dao.PinDAO;
import com.pinmate.team.dao.TeamDAO;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * '모두 인정' 판정 규칙.
 * - 팀원이 2명 미만이면 판정하지 않는다
 * - 팀원이 늘어 다시 판정할 때는 'N명일 때 달성' 기록을 남기도록 keepRecord=true 로 저장한다
 */
@ExtendWith(MockitoExtension.class)
class PinServiceImplConsensusTest {

    private static final Long TEAM_ID = 7L;
    private static final Long PLACE_ID = 10L;

    @Mock
    private PinDAO pinDAO;

    @Mock
    private TeamDAO teamDAO;

    @InjectMocks
    private PinServiceImpl service;

    private void givenTeam(int memberCount, int recommendCount) {
        given(pinDAO.selectPinIdsByTeamId(TEAM_ID)).willReturn(List.of(PLACE_ID));
        given(teamDAO.selectTeamById(TEAM_ID)).willReturn(Map.of("consensus_rule", "all"));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(Collections.nCopies(memberCount, Map.of()));
        given(pinDAO.countRecommendationsByPlaceId(PLACE_ID)).willReturn(recommendCount);
    }

    @Test
    @DisplayName("혼자인 팀은 혼자 추천해도 모두 인정이 아니다")
    void singleMemberTeamIsNotApproved() throws Exception {
        givenTeam(1, 1);

        service.updateTeamConsensus(TEAM_ID);

        verify(pinDAO).updateConsensus(Map.of("placeId", PLACE_ID, "achieved", false, "memberCount", 1, "keepRecord", true));
    }

    @Test
    @DisplayName("2명 팀에서 2명 모두 추천하면 모두 인정")
    void allMembersRecommended() throws Exception {
        givenTeam(2, 2);

        service.updateTeamConsensus(TEAM_ID);

        verify(pinDAO).updateConsensus(Map.of("placeId", PLACE_ID, "achieved", true, "memberCount", 2, "keepRecord", true));
    }

    @Test
    @DisplayName("팀원이 3명으로 늘면 2명 추천은 미달 — 기록은 남기고 배지는 푼다")
    void newMemberReleasesBadgeButKeepsRecord() throws Exception {
        givenTeam(3, 2);

        service.updateTeamConsensus(TEAM_ID);

        verify(pinDAO).updateConsensus(Map.of("placeId", PLACE_ID, "achieved", false, "memberCount", 2, "keepRecord", true));
    }
}
