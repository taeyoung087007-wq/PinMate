package com.pinmate.friend.service.impl;

import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.friend.dao.FriendDAO;
import com.pinmate.friend.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("FriendService")
public class FriendServiceImpl implements FriendService {

	@Autowired
	private FriendDAO friendDAO;

	@Override
	@Transactional(readOnly = true)
	public Map<String, Object> selectOverview(Long userId) throws Exception {
		List<Map<String, Object>> friends = new ArrayList<>();
		for (Map<String, Object> row : friendDAO.selectFriends(userId)) {
			friends.add(toItem(row, "accepted_at", "since"));
		}

		List<Map<String, Object>> incoming = new ArrayList<>();
		for (Map<String, Object> row : friendDAO.selectIncoming(userId)) {
			incoming.add(toItem(row, "created_at", "requestedAt"));
		}

		List<Map<String, Object>> outgoing = new ArrayList<>();
		for (Map<String, Object> row : friendDAO.selectOutgoing(userId)) {
			outgoing.add(toItem(row, "created_at", "requestedAt"));
		}

		Map<String, Object> result = new HashMap<>();
		result.put("friends", friends);
		result.put("incoming", incoming);
		result.put("outgoing", outgoing);
		result.put("pendingCount", friendDAO.countIncoming(userId));
		return result;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> search(Long userId, String query) throws Exception {
		String q = query == null ? "" : query.trim();
		if (q.isEmpty()) return List.of();

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : friendDAO.searchUsers(ParamUtil.map("meId", userId, "q", "%" + q + "%"))) {
			list.add(toItem(row, null, null));
		}
		return list;
	}

	@Override
	@Transactional
	public Map<String, Object> sendRequest(Long userId, Long targetId) throws Exception {
		if (userId.equals(targetId)) {
			throw new IllegalArgumentException("나 자신은 친구로 추가할 수 없습니다.");
		}
		if (friendDAO.selectUserById(targetId) == null) return null;

		Map<String, Object> relation = friendDAO.selectRelation(ParamUtil.map("a", userId, "b", targetId));
		if (relation != null) {
			if ("accepted".equals(relation.get("status"))) {
				return ParamUtil.map("status", "already");
			}
			Long requester = ((Number) relation.get("requester_id")).longValue();
			if (userId.equals(requester)) {
				return ParamUtil.map("status", "pending");   // 이미 보낸 요청
			}
			// 상대가 먼저 보낸 요청이면 곧바로 수락한다
			friendDAO.acceptRequest(ParamUtil.map("requesterId", targetId, "addresseeId", userId));
			return ParamUtil.map("status", "accepted");
		}

		friendDAO.insertRequest(ParamUtil.map("requesterId", userId, "addresseeId", targetId));
		return ParamUtil.map("status", "pending");
	}

	@Override
	@Transactional
	public boolean accept(Long userId, Long requesterId) throws Exception {
		if (requesterId == null || userId.equals(requesterId)) return false;
		return friendDAO.acceptRequest(ParamUtil.map("requesterId", requesterId, "addresseeId", userId)) > 0;
	}

	@Override
	@Transactional
	public boolean remove(Long userId, Long otherId) throws Exception {
		if (otherId == null || userId.equals(otherId)) return false;
		return friendDAO.deleteRelation(ParamUtil.map("a", userId, "b", otherId)) > 0;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectFriendPlaces(Long userId, Long friendId) throws Exception {
		if (friendId == null || userId.equals(friendId)) return null;

		Map<String, Object> relation = friendDAO.selectRelation(ParamUtil.map("a", userId, "b", friendId));
		if (relation == null || !"accepted".equals(relation.get("status"))) return null;

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : friendDAO.selectPublicPlaces(friendId)) {
			Map<String, Object> item = new HashMap<>();
			// 팀 핀 id 와 섞이지 않도록 접두어를 붙인다
			item.put("id", "f-" + row.get("personal_place_id"));
			item.put("name", row.get("name"));
			item.put("category", toFrontendCategory((String) row.get("category")));
			item.put("address", row.get("address"));
			item.put("roadAddress", row.get("road_address"));
			item.put("lat", toDouble(row.get("latitude")));
			item.put("lng", toDouble(row.get("longitude")));
			item.put("kakaoPlaceId", row.get("kakao_place_id"));   // 같은 장소 판별 키. 직접 찍은 핀·기존 행은 null
			item.put("memo", row.get("memo"));
			item.put("owner", row.get("nickname"));
			item.put("ownerLoginId", row.get("login_id"));
			item.put("ownerColor", row.get("avatar_bg"));
			item.put("personal", true);
			item.put("isPublic", true);
			list.add(item);
		}
		return list;
	}

	private Double toDouble(Object v) {
		return (v == null) ? null : ((Number) v).doubleValue();
	}

	// DB 카테고리 → 프론트 카테고리 (PersonalPlaceServiceImpl 과 같은 규칙)
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

	// 화면이 그대로 쓸 수 있는 사용자 항목. timeKey 가 있으면 그 시각을 timeOutKey 로 내려준다
	private Map<String, Object> toItem(Map<String, Object> row, String timeKey, String timeOutKey) {
		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(row.get("user_id")));
		item.put("loginId", row.get("login_id"));
		item.put("nickname", row.get("nickname"));
		item.put("avatarId", row.get("avatar_id"));
		item.put("avatarBg", row.get("avatar_bg"));
		if (timeKey != null) item.put(timeOutKey, toIso(row.get(timeKey)));
		if (row.get("status") != null) item.put("status", row.get("status"));
		if (row.get("direction") != null) item.put("direction", row.get("direction"));
		return item;
	}

	// timestamptz 는 HashMap 결과에서 java.sql.Timestamp 로 온다. 프론트가 new Date() 로 읽도록 ISO-8601(UTC) 문자열로
	private String toIso(Object v) {
		if (v == null) return null;
		return (v instanceof Timestamp ts) ? ts.toInstant().toString() : v.toString();
	}
}
