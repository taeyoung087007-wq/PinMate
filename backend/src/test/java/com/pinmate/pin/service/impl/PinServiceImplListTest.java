package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.dao.PinDAO;
import com.pinmate.team.dao.TeamDAO;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 핀 목록 조회. 추천인을 핀마다 조회하지 않고(N+1) 팀 단위로 한 번에 읽어 핀별로 나눈다.
 */
@ExtendWith(MockitoExtension.class)
class PinServiceImplListTest {

    private static final Long TEAM_ID = 7L;
    private static final Long USER_ID = 8L;

    @Mock
    private PinDAO pinDAO;

    @Mock
    private TeamDAO teamDAO;

    @InjectMocks
    private PinServiceImpl service;

    private static Map<String, Object> row(long placeId, String loginId) {
        return Map.of("place_id", placeId, "login_id", loginId);
    }

    @Test
    @DisplayName("추천인을 팀 단위로 한 번에 읽어 핀별로 순서대로 나눈다")
    void groupsRecommendersByPin() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, USER_ID)).willReturn(true);
        given(pinDAO.selectPinsByTeamId(TEAM_ID)).willReturn(List.of(
                Map.<String, Object>of("place_id", 1L, "team_id", TEAM_ID),
                Map.<String, Object>of("place_id", 2L, "team_id", TEAM_ID)));
        given(pinDAO.selectRecommendersByTeamId(TEAM_ID)).willReturn(List.of(row(1, "minji"), row(1, "junho"), row(2, "junho")));

        List<Map<String, Object>> pins = service.selectPinList(TEAM_ID, USER_ID);

        assertThat(pins.get(0).get("recommenders")).isEqualTo(List.of("minji", "junho"));
        assertThat(pins.get(1).get("recommenders")).isEqualTo(List.of("junho"));
        verify(pinDAO, never()).selectRecommendersByPlaceId(anyLong());
    }

    @Test
    @DisplayName("추천인별 한 줄 평을 login_id 로 묶어 내려주고, 평이 없는 추천인은 뺀다")
    void includesCommentsPerRecommender() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, USER_ID)).willReturn(true);
        given(pinDAO.selectPinsByTeamId(TEAM_ID)).willReturn(List.of(Map.<String, Object>of("place_id", 1L, "team_id", TEAM_ID)));
        given(pinDAO.selectRecommendersByTeamId(TEAM_ID)).willReturn(List.of(
                Map.of("place_id", 1L, "login_id", "minji", "comment", "라떼 맛집"),
                row(1, "junho")));   // 평이 없는 추천인 (실제로는 call-setters-on-nulls 로 comment=null 이 온다. get 결과는 같다)

        List<Map<String, Object>> pins = service.selectPinList(TEAM_ID, USER_ID);

        assertThat(pins.get(0).get("recommenders")).isEqualTo(List.of("minji", "junho"));
        assertThat(pins.get(0).get("comments")).isEqualTo(Map.of("minji", "라떼 맛집"));
    }
}
