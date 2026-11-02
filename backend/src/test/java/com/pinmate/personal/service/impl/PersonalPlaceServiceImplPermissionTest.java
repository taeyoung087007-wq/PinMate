package com.pinmate.personal.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.personal.dao.PersonalPlaceDAO;
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
 * 개인 장소 권한 규칙. 본인 장소만 수정·삭제할 수 있고, 남의 장소는 NO_PERMISSION, 없으면 NOT_FOUND.
 * (DB 없이 DAO 를 대체해 규칙만 검증한다)
 */
@ExtendWith(MockitoExtension.class)
class PersonalPlaceServiceImplPermissionTest {

    private static final Long PLACE_ID = 20L;
    private static final Long OWNER_ID = 8L;
    private static final Long OTHER_ID = 11L;

    @Mock
    private PersonalPlaceDAO personalPlaceDAO;

    @InjectMocks
    private PersonalPlaceServiceImpl service;

    private Map<String, Object> existingPlace() {
        Map<String, Object> row = new HashMap<>();
        row.put("personal_place_id", PLACE_ID);
        row.put("user_id", OWNER_ID);
        row.put("name", "대림창고");
        row.put("category", "cafe");
        row.put("latitude", 37.5);
        row.put("longitude", 127.0);
        row.put("login_id", "pincheck");
        return row;
    }

    @Test
    @DisplayName("본인 장소는 수정·삭제할 수 있다")
    void ownerCanEdit() throws Exception {
        given(personalPlaceDAO.selectPersonalPlaceById(PLACE_ID)).willReturn(existingPlace());

        assertThat(service.selectEditCode(PLACE_ID, OWNER_ID)).isEqualTo(Constants.SUCCESS);
    }

    @Test
    @DisplayName("남의 장소는 수정·삭제할 수 없다")
    void othersCannotEdit() throws Exception {
        given(personalPlaceDAO.selectPersonalPlaceById(PLACE_ID)).willReturn(existingPlace());

        assertThat(service.selectEditCode(PLACE_ID, OTHER_ID)).isEqualTo(Constants.NO_PERMISSION);
    }

    @Test
    @DisplayName("없는 장소면 NOT_FOUND")
    void missingPlace() throws Exception {
        given(personalPlaceDAO.selectPersonalPlaceById(PLACE_ID)).willReturn(null);

        assertThat(service.selectEditCode(PLACE_ID, OWNER_ID)).isEqualTo(Constants.NOT_FOUND);
    }

    @Test
    @DisplayName("수정 시 카테고리는 DB 값으로 변환되고 메모는 그대로 저장된다")
    void updateWritesDbCategory() throws Exception {
        given(personalPlaceDAO.selectPersonalPlaceById(PLACE_ID)).willReturn(existingPlace());

        service.update(PLACE_ID, Map.of("name", "새 이름", "category", "drink", "memo", "여기 좋아요"));

        // drink 는 DB CHECK 값인 bar 로 변환되어 저장된다
        verify(personalPlaceDAO).updatePersonalPlace(
                Map.of("personalPlaceId", PLACE_ID, "name", "새 이름", "category", "bar", "memo", "여기 좋아요"));
    }

    @Test
    @DisplayName("목록 변환은 화면(핀) 형태로 내려주고 personal=true 로 표시한다")
    void listMapsToPinShape() throws Exception {
        given(personalPlaceDAO.selectPersonalPlacesByUserId(OWNER_ID)).willReturn(List.of(existingPlace()));

        Map<String, Object> item = service.selectList(OWNER_ID).get(0);

        assertThat(item.get("id")).isEqualTo(String.valueOf(PLACE_ID));
        assertThat(item.get("category")).isEqualTo("cafe");
        assertThat(item.get("personal")).isEqualTo(true);
        assertThat(item.get("recommenders")).isEqualTo(List.of("pincheck"));
        assertThat(item.get("isPublic")).isEqualTo(false);   // 기본은 비공개
    }

    @Test
    @DisplayName("공개 여부를 바꾸면 is_public 만 갱신된다")
    void updateVisibilityWritesFlag() throws Exception {
        given(personalPlaceDAO.selectPersonalPlaceById(PLACE_ID)).willReturn(existingPlace());

        service.updateVisibility(PLACE_ID, true);

        verify(personalPlaceDAO).updatePersonalVisibility(Map.of("personalPlaceId", PLACE_ID, "isPublic", true));
    }
}
