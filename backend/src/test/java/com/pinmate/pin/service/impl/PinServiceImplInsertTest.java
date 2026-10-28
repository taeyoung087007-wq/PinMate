package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.dao.PinDAO;
import com.pinmate.team.dao.TeamDAO;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 핀 등록. 같은 장소 중복 금지, 등록자 추천은 '다녀와서 추천해요'를 골랐을 때만 */
@ExtendWith(MockitoExtension.class)
class PinServiceImplInsertTest {

    private static final Long TEAM_ID = 7L;
    private static final Long USER_ID = 8L;
    private static final Long PLACE_ID = 10L;

    @Mock
    private PinDAO pinDAO;

    @Mock
    private TeamDAO teamDAO;

    @InjectMocks
    private PinServiceImpl service;

    private Map<String, Object> param(boolean recommend) {
        Map<String, Object> p = new HashMap<>();
        p.put("teamId", TEAM_ID);
        p.put("name", "이자카야 탕");
        p.put("category", "drink");
        p.put("address", "충북 청주시");
        p.put("lat", 36.62);
        p.put("lng", 127.32);
        p.put("memo", "꼬치 맛집");
        p.put("recommend", recommend);
        return p;
    }

    private void givenInsertSucceeds(List<String> recommenders) {
        given(teamDAO.isTeamMember(TEAM_ID, USER_ID)).willReturn(true);
        given(pinDAO.selectSamePinId(anyMap())).willReturn(null);   // stub 안 하면 Mockito 는 Long 에 0 을 돌려준다
        given(pinDAO.insertPin(anyMap())).will(inv -> {
            inv.<Map<String, Object>>getArgument(0).put("placeId", PLACE_ID);
            return 1;
        });
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(Map.of("place_id", PLACE_ID, "team_id", TEAM_ID));
        given(pinDAO.selectRecommenderIds(anyLong())).willReturn(recommenders);
    }

    @Test
    @DisplayName("같은 모임에 같은 장소가 있으면 등록하지 않는다")
    void rejectsDuplicate() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, USER_ID)).willReturn(true);
        given(pinDAO.selectSamePinId(anyMap())).willReturn(16L);
        given(pinDAO.selectPinById(16L)).willReturn(Map.of("place_id", 16L, "team_id", TEAM_ID));
        given(pinDAO.selectRecommenderIds(16L)).willReturn(List.of());

        Map<String, Object> result = service.insertPin(param(true), USER_ID);

        assertThat(result).containsKey("duplicateOf");
        verify(teamDAO).lockTeam(TEAM_ID);
        verify(pinDAO, never()).insertPin(anyMap());
    }

    @Test
    @DisplayName("추천 없이 찍어두면 추천 0명으로 등록된다")
    void insertWithoutRecommendation() throws Exception {
        givenInsertSucceeds(List.of());

        service.insertPin(param(false), USER_ID);

        verify(pinDAO, never()).insertRecommendation(anyMap());
    }

    @Test
    @DisplayName("다녀와서 추천하면 등록자가 추천평과 함께 첫 추천인이 된다")
    void insertWithRecommendation() throws Exception {
        givenInsertSucceeds(List.of("admin"));

        service.insertPin(param(true), USER_ID);

        verify(pinDAO).insertRecommendation(Map.of("placeId", PLACE_ID, "userId", USER_ID, "comment", "꼬치 맛집"));
    }
}
