package com.pinmate.friend.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.friend.dao.FriendDAO;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 친구 요청 흐름 + 검색어 이스케이프.
 * - 나 자신·없는 사용자는 거른다
 * - 이미 친구면 already, 내가 이미 보냈으면 pending
 * - 상대가 먼저 보낸 요청이면 곧바로 수락(accepted)
 * - LIKE 특수문자는 와일드카드로 해석되지 않게 이스케이프한다
 */
@ExtendWith(MockitoExtension.class)
class FriendServiceImplTest {

    private static final Long ME = 13L;
    private static final Long OTHER = 21L;

    @Mock
    private FriendDAO friendDAO;

    @InjectMocks
    private FriendServiceImpl service;

    private Map<String, Object> relation(Long requester, String status) {
        return Map.of("requester_id", requester, "addressee_id", requester.equals(ME) ? OTHER : ME, "status", status);
    }

    @Test
    @DisplayName("나 자신은 친구로 추가할 수 없다")
    void rejectsSelf() {
        assertThatThrownBy(() -> service.sendRequest(ME, ME))
                .isInstanceOf(IllegalArgumentException.class);
        verify(friendDAO, never()).insertRequest(anyMap());
    }

    @Test
    @DisplayName("없는 사용자면 null (NOT_FOUND)")
    void missingTarget() throws Exception {
        given(friendDAO.selectUserById(OTHER)).willReturn(null);

        assertThat(service.sendRequest(ME, OTHER)).isNull();
    }

    @Test
    @DisplayName("이미 친구면 already")
    void alreadyFriends() throws Exception {
        given(friendDAO.selectUserById(OTHER)).willReturn(Map.of("user_id", OTHER));
        given(friendDAO.selectRelation(anyMap())).willReturn(relation(ME, "accepted"));

        assertThat(service.sendRequest(ME, OTHER)).containsEntry("status", "already");
    }

    @Test
    @DisplayName("내가 이미 보낸 요청이면 pending")
    void alreadyRequested() throws Exception {
        given(friendDAO.selectUserById(OTHER)).willReturn(Map.of("user_id", OTHER));
        given(friendDAO.selectRelation(anyMap())).willReturn(relation(ME, "pending"));

        assertThat(service.sendRequest(ME, OTHER)).containsEntry("status", "pending");
        verify(friendDAO, never()).insertRequest(anyMap());
    }

    @Test
    @DisplayName("상대가 먼저 보낸 요청이면 바로 수락한다")
    void acceptsReverseRequest() throws Exception {
        given(friendDAO.selectUserById(OTHER)).willReturn(Map.of("user_id", OTHER));
        given(friendDAO.selectRelation(anyMap())).willReturn(relation(OTHER, "pending"));

        assertThat(service.sendRequest(ME, OTHER)).containsEntry("status", "accepted");
        verify(friendDAO).acceptRequest(anyMap());
    }

    @Test
    @DisplayName("관계가 없으면 요청을 새로 저장한다")
    void insertsNewRequest() throws Exception {
        given(friendDAO.selectUserById(OTHER)).willReturn(Map.of("user_id", OTHER));
        given(friendDAO.selectRelation(anyMap())).willReturn(null);

        assertThat(service.sendRequest(ME, OTHER)).containsEntry("status", "pending");
        verify(friendDAO).insertRequest(anyMap());
    }

    @Test
    @DisplayName("받은 요청이 없으면 수락은 false")
    void acceptWithoutRequest() throws Exception {
        given(friendDAO.acceptRequest(anyMap())).willReturn(0);

        assertThat(service.accept(ME, OTHER)).isFalse();
    }

    @Test
    @DisplayName("친구가 아니면 친구 장소를 볼 수 없다")
    void friendPlacesRequiresFriendship() throws Exception {
        given(friendDAO.selectRelation(anyMap())).willReturn(relation(OTHER, "pending"));

        assertThat(service.selectFriendPlaces(ME, OTHER)).isNull();
    }

    @Test
    @DisplayName("친구의 공개 장소는 소유자 정보와 함께 내려준다")
    void friendPlacesMapped() throws Exception {
        given(friendDAO.selectRelation(anyMap())).willReturn(relation(ME, "accepted"));
        given(friendDAO.selectPublicPlaces(OTHER)).willReturn(java.util.List.of(
                Map.of("personal_place_id", 5L, "name", "카페", "category", "restaurant",
                        "latitude", 37.5, "longitude", 127.0, "nickname", "규범",
                        "login_id", "admin", "avatar_bg", "#ffffff")));

        java.util.List<Map<String, Object>> list = service.selectFriendPlaces(ME, OTHER);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).get("id")).isEqualTo("f-5");
        assertThat(list.get(0).get("category")).isEqualTo("food");
        assertThat(list.get(0).get("owner")).isEqualTo("규범");
    }

    @Test
    @DisplayName("% 나 _ 만 넣어도 전체 회원이 검색되지 않게 이스케이프한다")
    void escapesLikeWildcards() throws Exception {
        given(friendDAO.searchUsers(anyMap())).willReturn(java.util.List.of());

        service.search(ME, "%");
        service.search(ME, "_");
        service.search(ME, "a%b_c\\d");

        org.mockito.ArgumentCaptor<Map<String, Object>> captor =
                org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(friendDAO, org.mockito.Mockito.times(3)).searchUsers(captor.capture());
        assertThat(captor.getAllValues().get(0).get("q")).isEqualTo("%\\%%");
        assertThat(captor.getAllValues().get(1).get("q")).isEqualTo("%\\_%");
        assertThat(captor.getAllValues().get(2).get("q")).isEqualTo("%a\\%b\\_c\\\\d%");
    }
}
