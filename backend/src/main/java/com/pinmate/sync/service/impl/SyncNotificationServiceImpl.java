package com.pinmate.sync.service.impl;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.sync.dao.SyncNotificationDAO;
import com.pinmate.sync.service.SyncNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("SyncNotificationService")
public class SyncNotificationServiceImpl implements SyncNotificationService {

	@Autowired
	private SyncNotificationDAO syncNotificationDAO;

	@Override
	@Transactional
	public void notifyPinAdded(Long teamId, Long actorId, Map<String, Object> pin) throws Exception {
		if (pin == null) return;
		syncNotificationDAO.insertAdded(toParam(teamId, actorId, pin));
	}

	@Override
	@Transactional
	public void notifyPinDeleted(Long teamId, Long actorId, Map<String, Object> pin) throws Exception {
		if (pin == null) return;

		// 담을 대상이 사라졌으니, 아직 처리하지 않은 '추가' 알림은 지운다
		syncNotificationDAO.deletePendingAddedByPin(((Number) pin.get("place_id")).longValue());
		syncNotificationDAO.insertDeleted(toParam(teamId, actorId, pin));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<String, Object> selectOverview(Long userId) throws Exception {
		List<Map<String, Object>> items = new ArrayList<>();
		for (Map<String, Object> row : syncNotificationDAO.selectNotifications(userId)) {
			Map<String, Object> item = new HashMap<>();
			item.put("id", String.valueOf(row.get("notification_id")));
			item.put("teamId", String.valueOf(row.get("team_id")));
			item.put("teamName", row.get("team_name"));
			item.put("type", row.get("type"));
			item.put("status", row.get("status"));
			item.put("name", row.get("name"));
			item.put("category", toFrontendCategory((String) row.get("category")));
			item.put("address", row.get("address"));
			item.put("roadAddress", row.get("road_address"));
			item.put("lat", toDouble(row.get("latitude")));
			item.put("lng", toDouble(row.get("longitude")));
			item.put("memo", row.get("memo"));
			item.put("actorLoginId", row.get("actor_login_id"));
			item.put("actorNickname", row.get("actor_nickname"));
			item.put("createdAt", toIso(row.get("created_at")));
			item.put("handledAt", toIso(row.get("handled_at")));
			items.add(item);
		}

		Map<String, Object> result = new HashMap<>();
		result.put("pendingCount", syncNotificationDAO.countPending(userId));
		result.put("items", items);
		return result;
	}

	@Override
	@Transactional(readOnly = true)
	public int countPending(Long userId) throws Exception {
		return syncNotificationDAO.countPending(userId);
	}

	@Override
	@Transactional
	public String apply(Long notificationId, Long userId) throws Exception {
		Map<String, Object> notification = syncNotificationDAO.selectNotification(
				ParamUtil.map("notificationId", notificationId, "userId", userId));
		if (notification == null) return Constants.NOT_FOUND;

		applyNotification(userId, notification);
		return Constants.SUCCESS;
	}

	@Override
	@Transactional
	public String ignore(Long notificationId, Long userId) throws Exception {
		int updated = syncNotificationDAO.updateStatus(
				ParamUtil.map("notificationId", notificationId, "userId", userId, "status", "ignored"));
		return (updated > 0) ? Constants.SUCCESS : Constants.NOT_FOUND;
	}

	@Override
	@Transactional
	public String applyAll(Long teamId, Long userId) throws Exception {
		for (Map<String, Object> notification : syncNotificationDAO.selectPendingByTeam(
				ParamUtil.map("teamId", teamId, "userId", userId))) {
			applyNotification(userId, notification);
		}
		return Constants.SUCCESS;
	}

	@Override
	@Transactional
	public String ignoreAll(Long teamId, Long userId) throws Exception {
		syncNotificationDAO.updateStatusByTeam(
				ParamUtil.map("teamId", teamId, "userId", userId, "status", "ignored"));
		return Constants.SUCCESS;
	}

	// 알림 한 건을 내 지도에 반영하고 처리됨으로 바꾼다. 이미 처리한 알림이면 아무 것도 하지 않는다
	private void applyNotification(Long userId, Map<String, Object> notification) {
		if (!"pending".equals(notification.get("status"))) return;

		Map<String, Object> param = ParamUtil.map(
				"userId", userId,
				"name", notification.get("name"),
				"category", notification.get("category"),
				"roadAddress", notification.get("road_address"),
				"address", notification.get("address"),
				"latitude", notification.get("latitude"),
				"longitude", notification.get("longitude"),
				"memo", notification.get("memo"),
				"kakaoPlaceId", notification.get("kakao_place_id"));

		if ("added".equals(notification.get("type"))) {
			syncNotificationDAO.insertPersonalFromNotification(param);   // 이미 있으면 건너뛴다
		} else {
			syncNotificationDAO.deleteSamePersonalPlace(param);
		}

		syncNotificationDAO.updateStatus(ParamUtil.map(
				"notificationId", notification.get("notification_id"),
				"userId", userId,
				"status", "applied"));
	}

	// 핀 행(places)을 알림 저장 값으로 바꾼다. 장소 정보를 복사해 두어야 팀 장소가 지워진 뒤에도 반영할 수 있다
	private static Map<String, Object> toParam(Long teamId, Long actorId, Map<String, Object> pin) {
		return ParamUtil.map(
				"teamId", teamId,
				"actorId", actorId,
				"pinId", ((Number) pin.get("place_id")).longValue(),
				"name", pin.get("name"),
				"category", pin.get("category"),
				"roadAddress", pin.get("road_address"),
				"address", pin.get("address"),
				"latitude", pin.get("latitude"),
				"longitude", pin.get("longitude"),
				"memo", pin.get("memo"),
				"kakaoPlaceId", pin.get("kakao_place_id"));
	}

	private static String toFrontendCategory(String cat) {
		if (cat == null) return "etc";
		return switch (cat.toLowerCase().trim()) {
			case "restaurant" -> "food";
			case "bar" -> "drink";
			case "attraction" -> "sight";
			case "activity" -> "play";
			default -> cat.toLowerCase().trim();
		};
	}

	private static Double toDouble(Object v) {
		return (v == null) ? null : ((Number) v).doubleValue();
	}

	private static String toIso(Object v) {
		if (v == null) return null;
		return (v instanceof Timestamp ts) ? ts.toInstant().toString() : v.toString();
	}
}
