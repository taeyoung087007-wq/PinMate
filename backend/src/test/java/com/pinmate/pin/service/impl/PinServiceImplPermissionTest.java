package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.cmmn.util.Constants;
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

/**
 * 핀 수정·삭제 권한 규칙.
 * 등록자 본인과 팀 owner 만 손댈 수 있고, 일반 팀원은 NO_PERMISSION,
 * 팀 멤버가 아니거나 없는 핀은 NOT_FOUND 여야 한다.
 * (DB 없이 DAO 를 대체해 규칙만 검증한다)
 */
@ExtendWith(MockitoExtension.class)
class PinServiceImplPermissionTest {

    private static final Long PLACE_ID = 10L;
    private static final Long TEAM_ID = 7L;
    private static final Long CREATOR_ID = 8L;
    private static final Long OWNER_ID = 9L;
    private static final Long OTHER_ID = 11L;

    @Mock
    private PinDAO pinDAO;

    @Mock
    private TeamDAO teamDAO;

    @InjectMocks
    private PinServiceImpl service;

    private Map<String, Object> existingPin() {
        Map<String, Object> pin = new HashMap<>();
        pin.put("place_id", PLACE_ID);
        pin.put("team_id", TEAM_ID);
        pin.put("created_by", CREATOR_ID);
        pin.put("name", "대림창고");
        pin.put("category", "cafe");
        return pin;
    }

    private Map<String, Object> member(Long userId, String role) {
        return Map.of("user_id", userId, "role", role);
    }

    @Test
    @DisplayName("등록자는 자기 핀을 수정·삭제할 수 있다")
    void creatorCanEdit() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDAO.isTeamMember(TEAM_ID, CREATOR_ID)).willReturn(true);

        assertThat(service.selectEditCode(PLACE_ID, CREATOR_ID)).isEqualTo(Constants.SUCCESS);
    }

    @Test
    @DisplayName("팀 owner 는 남이 등록한 핀도 수정·삭제할 수 있다")
    void ownerCanEditOthersPin() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDAO.isTeamMember(TEAM_ID, OWNER_ID)).willReturn(true);
        given(teamDAO.selectTeamMembers(TEAM_ID))
                .willReturn(List.of(member(CREATOR_ID, "member"), member(OWNER_ID, "owner")));

        assertThat(service.selectEditCode(PLACE_ID, OWNER_ID)).isEqualTo(Constants.SUCCESS);
    }

    @Test
    @DisplayName("일반 팀원은 남의 핀을 수정·삭제할 수 없다")
    void memberCannotEditOthersPin() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDAO.isTeamMember(TEAM_ID, OTHER_ID)).willReturn(true);
        given(teamDAO.selectTeamMembers(TEAM_ID))
                .willReturn(List.of(member(CREATOR_ID, "member"), member(OTHER_ID, "member")));

        assertThat(service.selectEditCode(PLACE_ID, OTHER_ID)).isEqualTo(Constants.NO_PERMISSION);
    }

    @Test
    @DisplayName("팀 멤버가 아니면 핀이 있어도 없는 것과 같이 NOT_FOUND")
    void nonMemberSeesNotFound() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDAO.isTeamMember(TEAM_ID, OTHER_ID)).willReturn(false);

        assertThat(service.selectEditCode(PLACE_ID, OTHER_ID)).isEqualTo(Constants.NOT_FOUND);
    }

    @Test
    @DisplayName("없는 핀이면 NOT_FOUND")
    void missingPin() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(null);

        assertThat(service.selectEditCode(PLACE_ID, CREATOR_ID)).isEqualTo(Constants.NOT_FOUND);
    }

    @Test
    @DisplayName("수정하면 카테고리는 DB 값으로 바뀌고, 추천평은 등록자의 추천 행에 저장된다")
    void updateWritesNameCategoryAndCreatorComment() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(pinDAO.selectRecommenderIds(anyLong())).willReturn(List.of());

        Map<String, Object> param = new HashMap<>();
        param.put("name", "새 이름");
        param.put("category", "drink");
        param.put("memo", "여기 좋아요");
        service.updatePin(PLACE_ID, param);

        // drink 는 DB CHECK 값인 bar 로 변환되어 저장된다
        verify(pinDAO).updatePin(Map.of("placeId", PLACE_ID, "name", "새 이름", "category", "bar"));
        verify(pinDAO).updateRecommendationComment(Map.of("placeId", PLACE_ID, "userId", CREATOR_ID, "comment", "여기 좋아요"));
    }

    @Test
    @DisplayName("마지막 추천자가 취소해도 장소는 남는다 (찍어두기만 한 장소와 같다)")
    void lastRecommenderCancelKeepsPin() throws Exception {
        given(pinDAO.selectPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDAO.isTeamMember(TEAM_ID, CREATOR_ID)).willReturn(true);
        given(pinDAO.countRecommendation(anyMap())).willReturn(1);

        Map<String, Object> result = service.toggleRecommendation(PLACE_ID, CREATOR_ID);

        assertThat(result.get("pin")).isNotNull();
        verify(pinDAO).lockPin(PLACE_ID);
        verify(pinDAO).deleteRecommendation(anyMap());
        verify(pinDAO, never()).deletePin(anyLong());
    }
}
