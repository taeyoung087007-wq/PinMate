package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.dao.PinDAO;
import com.pinmate.team.dao.TeamDAO;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * '모두 인정' 판정 규칙과 일괄 재판정.
 * - 팀원이 2명 미만이면 판정하지 않는다
 * - 팀원이 늘어 다시 판정할 때는 'N명일 때 달성' 기록을 남기도록 keepRecord=true 로 저장한다
 * - 장소가 몇 개든 추천 수 조회 1번 + 갱신 1번이어야 한다 (장소 수 비례 N+1 방지)
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

    private Map<String, Object> countRow(long placeId, int recCount) {
        return Map.of("place_id", placeId, "rec_count", (long) recCount);
    }

    private void givenAllTeam(int memberCount, int recommendCount) {
        given(teamDAO.selectTeamById(TEAM_ID)).willReturn(Map.of("consensus_rule", "all"));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(Collections.nCopies(memberCount, Map.of()));
        given(pinDAO.selectRecommendationCountsByTeamId(TEAM_ID))
                .willReturn(List.of(countRow(PLACE_ID, recommendCount)));
    }

    private void givenMinCountTeam(int minCount, int memberCount, int recommendCount) {
        given(teamDAO.selectTeamById(TEAM_ID))
                .willReturn(Map.of("consensus_rule", "min_count", "consensus_min_count", minCount));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(Collections.nCopies(memberCount, Map.of()));
        given(pinDAO.selectRecommendationCountsByTeamId(TEAM_ID))
                .willReturn(List.of(countRow(PLACE_ID, recommendCount)));
    }

    private void expectBatch(boolean achieved, int recCount) throws Exception {
        Map<String, Object> row = Map.of(
                "placeId", PLACE_ID, "achieved", achieved, "recCount", recCount, "keepRecord", true);
        verify(pinDAO, times(1)).updateTeamConsensus(Map.of("rows", List.of(row)));
        verify(pinDAO, never()).countRecommendationsByPlaceId(anyLong());
        verify(pinDAO, never()).updateConsensus(anyMap());
    }

    @Test
    @DisplayName("혼자인 팀은 혼자 추천해도 모두 인정이 아니다")
    void singleMemberTeamIsNotApproved() throws Exception {
        givenAllTeam(1, 1);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(false, 1);
    }

    @Test
    @DisplayName("2명 팀에서 2명 모두 추천하면 모두 인정")
    void allMembersRecommended() throws Exception {
        givenAllTeam(2, 2);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(true, 2);
    }

    @Test
    @DisplayName("팀원이 3명으로 늘면 2명 추천은 미달 — 기록은 남기고 배지는 푼다")
    void newMemberReleasesBadgeButKeepsRecord() throws Exception {
        givenAllTeam(3, 2);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(false, 2);
    }

    @Test
    @DisplayName("추천이 0개인 장소도 재판정 대상에서 빠지지 않는다")
    void zeroRecommendationPlaceIsJudged() throws Exception {
        givenAllTeam(2, 0);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(false, 0);
    }

    @Test
    @DisplayName("N명 기준이면 5명 팀에서 3명 추천으로 모두 인정")
    void minCountRuleApprovesAtThreshold() throws Exception {
        givenMinCountTeam(3, 5, 3);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(true, 3);
    }

    @Test
    @DisplayName("N명 기준에 못 미치면 인정하지 않는다")
    void minCountRuleBelowThreshold() throws Exception {
        givenMinCountTeam(3, 5, 2);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(false, 2);
    }

    @Test
    @DisplayName("팀원이 기준 인원보다 적으면 전원 추천으로 인정한다")
    void minCountAboveMembersFallsBackToAll() throws Exception {
        givenMinCountTeam(5, 3, 3);

        service.updateTeamConsensus(TEAM_ID);

        expectBatch(true, 3);
    }

    @Test
    @DisplayName("장소가 5개여도 추천 수 조회·갱신은 각각 한 번")
    void batchKeepsQueryCountConstant() throws Exception {
        given(teamDAO.selectTeamById(TEAM_ID)).willReturn(Map.of("consensus_rule", "all"));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(Collections.nCopies(2, Map.of()));
        given(pinDAO.selectRecommendationCountsByTeamId(TEAM_ID)).willReturn(List.of(
                countRow(10L, 2), countRow(11L, 1), countRow(12L, 0), countRow(13L, 2), countRow(14L, 1)));

        service.updateTeamConsensus(TEAM_ID);

        verify(pinDAO, times(1)).selectRecommendationCountsByTeamId(TEAM_ID);
        verify(pinDAO, never()).countRecommendationsByPlaceId(anyLong());
        verify(pinDAO, never()).updateConsensus(anyMap());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(pinDAO, times(1)).updateTeamConsensus(captor.capture());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) captor.getValue().get("rows");
        assertThat(rows).hasSize(5);
        assertThat(rows.get(0).get("achieved")).isEqualTo(true);   // 2명 추천 → 달성
        assertThat(rows.get(1).get("achieved")).isEqualTo(false);  // 1명 → 미달
        assertThat(rows.get(2).get("achieved")).isEqualTo(false);  // 0명 → 미달
        assertThat(rows.get(4).get("keepRecord")).isEqualTo(true);
    }

    @Test
    @DisplayName("장소가 없으면 UPDATE 자체를 보내지 않는다")
    void emptyTeamSkipsUpdate() throws Exception {
        given(teamDAO.selectTeamById(TEAM_ID)).willReturn(Map.of("consensus_rule", "all"));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(Collections.nCopies(2, Map.of()));
        given(pinDAO.selectRecommendationCountsByTeamId(TEAM_ID)).willReturn(List.of());

        service.updateTeamConsensus(TEAM_ID);

        verify(pinDAO, never()).updateTeamConsensus(anyMap());
    }
}
