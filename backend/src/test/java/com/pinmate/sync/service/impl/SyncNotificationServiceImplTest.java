package com.pinmate.sync.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.sync.dao.SyncNotificationDAO;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** 동기화 알림: 추가는 내 지도에 담고, 삭제는 내 지도에서 지운다. 이미 처리한 알림은 건드리지 않는다 */
@ExtendWith(MockitoExtension.class)
class SyncNotificationServiceImplTest {

    private static final Long ME = 9L;
    private static final Long ACTOR = 10L;
    private static final Long TEAM = 13L;
    private static final Long NOTIFICATION = 77L;

    @Mock
    private SyncNotificationDAO dao;

    @InjectMocks
    private SyncNotificationServiceImpl service;

    private static Map<String, Object> notification(String type, String status) {
        Map<String, Object> n = new HashMap<>();
        n.put("notification_id", NOTIFICATION);
        n.put("type", type);
        n.put("status", status);
        n.put("name", "이자카야 탕");
        n.put("category", "bar");
        n.put("road_address", "충북 청주시 흥덕구 오송읍 봉산2길 45-3");
        n.put("address", "충북 청주시 흥덕구 오송읍 봉산2길 45-3");
        n.put("latitude", new BigDecimal("36.6218697"));
        n.put("longitude", new BigDecimal("127.3194399"));
        n.put("memo", null);
        return n;
    }

    private static Map<String, Object> pinRow() {
        Map<String, Object> pin = new HashMap<>();
        pin.put("place_id", 16L);
        pin.put("team_id", TEAM);
        pin.put("name", "이자카야 탕");
        pin.put("category", "bar");
        pin.put("road_address", "충북 청주시 흥덕구 오송읍 봉산2길 45-3");
        pin.put("address", "충북 청주시 흥덕구 오송읍 봉산2길 45-3");
        pin.put("latitude", new BigDecimal("36.6218697"));
        pin.put("longitude", new BigDecimal("127.3194399"));
        pin.put("memo", null);
        return pin;
    }

    @Test
    @DisplayName("'추가' 알림을 반영하면 내 지도에 담고 처리됨으로 바꾼다")
    void applyAddedSavesPersonalPlace() throws Exception {
        given(dao.selectNotification(anyMap())).willReturn(notification("added", "pending"));

        assertThat(service.apply(NOTIFICATION, ME)).isEqualTo(Constants.SUCCESS);
        verify(dao).insertPersonalFromNotification(anyMap());
        verify(dao, never()).deleteSamePersonalPlace(anyMap());
        verify(dao).updateStatus(anyMap());
    }

    @Test
    @DisplayName("'삭제' 알림을 반영하면 내 지도에서 지운다")
    void applyDeletedRemovesPersonalPlace() throws Exception {
        given(dao.selectNotification(anyMap())).willReturn(notification("deleted", "pending"));

        assertThat(service.apply(NOTIFICATION, ME)).isEqualTo(Constants.SUCCESS);
        verify(dao).deleteSamePersonalPlace(anyMap());
        verify(dao, never()).insertPersonalFromNotification(anyMap());
    }

    @Test
    @DisplayName("이미 처리한 알림은 다시 반영하지 않는다")
    void applyHandledDoesNothing() throws Exception {
        given(dao.selectNotification(anyMap())).willReturn(notification("added", "applied"));

        assertThat(service.apply(NOTIFICATION, ME)).isEqualTo(Constants.SUCCESS);
        verify(dao, never()).insertPersonalFromNotification(anyMap());
        verify(dao, never()).updateStatus(anyMap());
    }

    @Test
    @DisplayName("내 알림이 아니면 찾을 수 없음")
    void applyUnknownNotification() throws Exception {
        given(dao.selectNotification(anyMap())).willReturn(null);

        assertThat(service.apply(NOTIFICATION, ME)).isEqualTo(Constants.NOT_FOUND);
        verify(dao, never()).insertPersonalFromNotification(anyMap());
    }

    @Test
    @DisplayName("팀 장소가 지워지면 처리 안 한 '추가' 알림을 먼저 정리하고 '삭제' 알림을 만든다")
    void deleteCleansPendingAddedThenNotifiesDeleted() throws Exception {
        service.notifyPinDeleted(TEAM, ACTOR, pinRow());

        verify(dao).deletePendingAddedByPin(16L);
        verify(dao).insertDeleted(anyMap());
        verify(dao, never()).insertAdded(anyMap());
    }

    @Test
    @DisplayName("팀에 장소가 생기면 '추가' 알림을 만든다")
    void addedCreatesNotifications() throws Exception {
        service.notifyPinAdded(TEAM, ACTOR, pinRow());

        verify(dao).insertAdded(anyMap());
        verify(dao, never()).insertDeleted(anyMap());
    }
}
