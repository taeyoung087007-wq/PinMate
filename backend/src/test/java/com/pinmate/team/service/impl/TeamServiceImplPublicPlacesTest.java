package com.pinmate.team.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
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

/** 모임원이 공개한 개인 장소: 모임원만 볼 수 있고, 화면이 쓰는 모양으로 내려준다 */
@ExtendWith(MockitoExtension.class)
class TeamServiceImplPublicPlacesTest {

    private static final Long TEAM_ID = 3L;
    private static final Long ME = 9L;

    @Mock
    private TeamDAO teamDAO;

    @Mock
    private PresenceService presenceService;

    @Mock
    private PinService pinService;

    @InjectMocks
    private TeamServiceImpl service;

    private static Map<String, Object> row() {
        Map<String, Object> row = new HashMap<>();
        row.put("personal_place_id", 41L);
        row.put("name", "모임원 카페");
        row.put("category", "restaurant");
        row.put("address", "천안시 동남구");
        row.put("road_address", "천안대로 1");
        row.put("latitude", new BigDecimal("36.6200"));
        row.put("longitude", new BigDecimal("127.3200"));
        row.put("memo", "맛있음");
        row.put("user_id", 10L);
        row.put("login_id", "admin1");
        row.put("nickname", "태영");
        row.put("avatar_bg", "#ffffff");
        return row;
    }

    @Test
    @DisplayName("모임원이 아니면 null (모임 존재 여부를 드러내지 않는다)")
    void nonMemberGetsNull() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, ME)).willReturn(false);

        assertThat(service.selectTeamPublicPlaces(TEAM_ID, ME)).isNull();
        verify(teamDAO, never()).selectTeamPublicPlaces(TEAM_ID, ME);
    }

    @Test
    @DisplayName("모임원이면 공개 핀을 화면 모양으로 돌려준다")
    void memberGetsPins() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, ME)).willReturn(true);
        given(teamDAO.selectTeamPublicPlaces(TEAM_ID, ME)).willReturn(List.of(row()));

        List<Map<String, Object>> pins = service.selectTeamPublicPlaces(TEAM_ID, ME);

        assertThat(pins).hasSize(1);
        Map<String, Object> pin = pins.get(0);
        assertThat(pin.get("id")).isEqualTo("m-41");          // 팀 핀·친구 핀 id 와 섞이지 않게 접두어
        assertThat(pin.get("category")).isEqualTo("food");    // restaurant → food
        assertThat(pin.get("lat")).isEqualTo(36.62);          // BigDecimal → double
        assertThat(pin.get("owner")).isEqualTo("태영");
        assertThat(pin.get("ownerId")).isEqualTo("10");
        assertThat(pin.get("personal")).isEqualTo(true);
        assertThat(pin.get("isPublic")).isEqualTo(true);
    }

    @Test
    @DisplayName("공개 핀이 없으면 빈 목록")
    void emptyWhenNoPins() throws Exception {
        given(teamDAO.isTeamMember(TEAM_ID, ME)).willReturn(true);
        given(teamDAO.selectTeamPublicPlaces(TEAM_ID, ME)).willReturn(List.of());

        assertThat(service.selectTeamPublicPlaces(TEAM_ID, ME)).isEmpty();
    }
}
