package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.personal.dao.PersonalPlaceDAO;
import com.pinmate.pin.dao.PinDAO;
import com.pinmate.sync.service.SyncNotificationService;
import com.pinmate.team.dao.TeamDAO;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 내 지도 핀을 모임으로 가져오기: 없는 곳은 새 장소로, 있는 곳은 내 추천만 */
@ExtendWith(MockitoExtension.class)
class PinServiceImplImportTest {

    private static final Long TEAM_ID = 7L;
    private static final Long ME = 8L;
    private static final Long PERSONAL_ID = 21L;
    private static final Long NEW_PIN_ID = 31L;

    @Mock
    private PinDAO pinDAO;

    @Mock
    private TeamDAO teamDAO;

    @Mock
    private PersonalPlaceDAO personalPlaceDAO;

    @Mock
    private SyncNotificationService syncNotificationService;

    @InjectMocks
    private PinServiceImpl service;

    private static Map<String, Object> personalPlace(Long ownerId) {
        Map<String, Object> p = new HashMap<>();
        p.put("personal_place_id", PERSONAL_ID);
        p.put("user_id", ownerId);
        p.put("name", "이자카야 탕");
        p.put("category", "bar");
        p.put("road_address", "충북 청주시");
        p.put("address", "충북 청주시");
        p.put("latitude", new BigDecimal("36.6218697"));
        p.put("longitude", new BigDecimal("127.3194399"));
        p.put("memo", "꼬치 맛집");
        p.put("source", "search");
        return p;
    }

    private void givenMember() {
        given(teamDAO.isTeamMember(TEAM_ID, ME)).willReturn(true);
    }

    // 모두 인정 판정에 쓰는 값들. 팀원 2명, 추천 1명이면 달성하지 않는다
    private void givenConsensusInputs() {
        given(teamDAO.selectTeamById(TEAM_ID)).willReturn(Map.of("consensus_rule", "all"));
        given(teamDAO.selectTeamMembers(TEAM_ID)).willReturn(List.of(
                Map.of("user_id", ME, "role", "owner"), Map.of("user_id", 99L, "role", "member")));
        given(pinDAO.countRecommendationsByPlaceId(anyLong())).willReturn(1);
    }

    @Test
    @DisplayName("모임원이 아니면 null")
    void nonMemberGetsNull() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, 999L)).willReturn(false);

        assertThat(service.importPersonalPlaces(TEAM_ID, 999L, List.of(PERSONAL_ID))).isNull();
        verify(pinDAO, never()).insertPin(anyMap());
    }

    @Test
    @DisplayName("모임에 없는 장소는 새 팀 장소로 등록하고 내 추천을 붙인다")
    void createsNewPin() throws Exception {
        givenMember();
        given(personalPlaceDAO.selectPersonalPlaceById(PERSONAL_ID)).willReturn(personalPlace(ME));
        given(pinDAO.selectSamePinId(anyMap())).willReturn(null);
        given(pinDAO.insertPin(anyMap())).will(inv -> {
            inv.<Map<String, Object>>getArgument(0).put("placeId", NEW_PIN_ID);
            return 1;
        });
        given(pinDAO.selectPinById(NEW_PIN_ID)).willReturn(Map.of("place_id", NEW_PIN_ID, "team_id", TEAM_ID));
        givenConsensusInputs();

        Map<String, Object> result = service.importPersonalPlaces(TEAM_ID, ME, List.of(PERSONAL_ID));

        assertThat(result.get("imported")).isEqualTo(1);
        assertThat(result.get("recommended")).isEqualTo(0);
        verify(pinDAO).insertPin(anyMap());
        verify(pinDAO).insertRecommendation(anyMap());
        verify(syncNotificationService).notifyPinAdded(any(), any(), anyMap());
    }

    @Test
    @DisplayName("이미 모임에 있는 장소는 내 추천만 더한다")
    void recommendsExistingPin() throws Exception {
        givenMember();
        given(personalPlaceDAO.selectPersonalPlaceById(PERSONAL_ID)).willReturn(personalPlace(ME));
        given(pinDAO.selectSamePinId(anyMap())).willReturn(NEW_PIN_ID);
        given(pinDAO.countRecommendation(anyMap())).willReturn(0);
        givenConsensusInputs();

        Map<String, Object> result = service.importPersonalPlaces(TEAM_ID, ME, List.of(PERSONAL_ID));

        assertThat(result.get("imported")).isEqualTo(0);
        assertThat(result.get("recommended")).isEqualTo(1);
        verify(pinDAO, never()).insertPin(anyMap());
        verify(pinDAO).insertRecommendation(anyMap());
        verify(syncNotificationService, never()).notifyPinAdded(any(), any(), anyMap());
    }

    @Test
    @DisplayName("이미 추천한 장소는 건너뛴다")
    void skipsAlreadyRecommended() throws Exception {
        givenMember();
        given(personalPlaceDAO.selectPersonalPlaceById(PERSONAL_ID)).willReturn(personalPlace(ME));
        given(pinDAO.selectSamePinId(anyMap())).willReturn(NEW_PIN_ID);
        given(pinDAO.countRecommendation(anyMap())).willReturn(1);

        Map<String, Object> result = service.importPersonalPlaces(TEAM_ID, ME, List.of(PERSONAL_ID));

        assertThat(result.get("skipped")).isEqualTo(1);
        verify(pinDAO, never()).insertRecommendation(anyMap());
    }

    @Test
    @DisplayName("남의 개인 핀은 가져오지 않는다")
    void skipsOthersPlace() throws Exception {
        givenMember();
        given(personalPlaceDAO.selectPersonalPlaceById(PERSONAL_ID)).willReturn(personalPlace(99L));

        Map<String, Object> result = service.importPersonalPlaces(TEAM_ID, ME, List.of(PERSONAL_ID));

        assertThat(result.get("skipped")).isEqualTo(1);
        verify(pinDAO, never()).insertPin(anyMap());
    }
}
