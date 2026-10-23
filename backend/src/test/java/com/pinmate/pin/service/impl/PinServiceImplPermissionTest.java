package com.pinmate.pin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.pin.dao.PinDao;
import com.pinmate.pin.domain.Pin;
import com.pinmate.pin.dto.UpdatePinRequest;
import com.pinmate.team.dao.TeamDao;
import com.pinmate.team.domain.TeamMember;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 핀 수정·삭제 권한 규칙.
 * 등록자 본인과 팀 owner 만 손댈 수 있고, 일반 팀원은 403 이어야 한다.
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
    private PinDao pinDao;

    @Mock
    private TeamDao teamDao;

    private PinServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PinServiceImpl(pinDao, teamDao);
    }

    private Pin existingPin() {
        Pin pin = new Pin();
        pin.setPlaceId(PLACE_ID);
        pin.setTeamId(TEAM_ID);
        pin.setCreatedBy(CREATOR_ID);
        pin.setName("대림창고");
        pin.setCategory("cafe");
        return pin;
    }

    private TeamMember member(Long userId, String role) {
        TeamMember member = new TeamMember();
        member.setUserId(userId);
        member.setRole(role);
        return member;
    }

    @Test
    @DisplayName("등록자는 자기 핀을 삭제할 수 있다")
    void creatorCanDeleteOwnPin() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(existingPin());

        service.deletePin(PLACE_ID, CREATOR_ID);

        verify(pinDao).deletePin(PLACE_ID);
    }

    @Test
    @DisplayName("팀 owner 는 남이 등록한 핀도 삭제할 수 있다")
    void ownerCanDeleteOthersPin() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDao.findTeamMembersByTeamId(TEAM_ID))
                .willReturn(List.of(member(CREATOR_ID, "member"), member(OWNER_ID, "owner")));

        service.deletePin(PLACE_ID, OWNER_ID);

        verify(pinDao).deletePin(PLACE_ID);
    }

    @Test
    @DisplayName("일반 팀원은 남의 핀을 삭제할 수 없다 (403)")
    void memberCannotDeleteOthersPin() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDao.findTeamMembersByTeamId(TEAM_ID))
                .willReturn(List.of(member(CREATOR_ID, "member"), member(OTHER_ID, "member")));

        assertThatThrownBy(() -> service.deletePin(PLACE_ID, OTHER_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(pinDao, never()).deletePin(any());
    }

    @Test
    @DisplayName("없는 핀이면 404")
    void deleteFailsWhenPinMissing() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(null);

        assertThatThrownBy(() -> service.deletePin(PLACE_ID, CREATOR_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("등록자가 이름·카테고리·추천평을 고치면 저장소에 반영된다")
    void creatorCanUpdateOwnPin() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(existingPin());
        given(pinDao.findRecommenderIdsByPlaceId(PLACE_ID)).willReturn(List.of());
        given(pinDao.findVisitorIdsByPlaceId(PLACE_ID)).willReturn(List.of());

        service.updatePin(PLACE_ID, new UpdatePinRequest("새 이름", "drink", "여기 좋아요"), CREATOR_ID);

        // drink 는 DB CHECK 값인 bar 로 변환되어 저장된다
        verify(pinDao).updatePin(PLACE_ID, "새 이름", "bar");
        verify(pinDao).updateRecommendationComment(PLACE_ID, CREATOR_ID, "여기 좋아요");
    }

    @Test
    @DisplayName("일반 팀원은 핀을 수정할 수 없다 (403)")
    void memberCannotUpdateOthersPin() {
        given(pinDao.findPinById(PLACE_ID)).willReturn(existingPin());
        given(teamDao.findTeamMembersByTeamId(TEAM_ID))
                .willReturn(List.of(member(CREATOR_ID, "member"), member(OTHER_ID, "member")));

        assertThatThrownBy(() ->
                service.updatePin(PLACE_ID, new UpdatePinRequest("가로채기", "food", null), OTHER_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(pinDao, never()).updatePin(any(), any(), any());
    }
}
