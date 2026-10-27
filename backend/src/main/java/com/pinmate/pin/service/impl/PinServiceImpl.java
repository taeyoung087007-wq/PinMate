package com.pinmate.pin.service.impl;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.pin.dao.PinDAO;
import com.pinmate.pin.service.PinService;
import com.pinmate.team.dao.TeamDAO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("PinService")
public class PinServiceImpl implements PinService {

	@Autowired
	private PinDAO pinDAO;

	@Autowired
	private TeamDAO teamDAO;

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectPinList(Long teamId, Long userId) throws Exception {
		if (!teamDAO.isTeamMember(teamId, userId)) return null;

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : pinDAO.selectPinsByTeamId(teamId)) {
			list.add(toItem(row));
		}
		return list;
	}

	@Override
	@Transactional
	public Map<String, Object> insertPin(Map<String, Object> param, Long userId) throws Exception {
		Long teamId = (Long) param.get("teamId");
		if (!teamDAO.isTeamMember(teamId, userId)) return null;

		String address = (String) param.get("address");
		String roadAddress = (String) param.get("roadAddress");

		Map<String, Object> pin = ParamUtil.map(
				"teamId", teamId,
				"name", param.get("name"),
				"category", toDbCategory((String) param.get("category")),
				"address", address,
				"roadAddress", roadAddress == null ? address : roadAddress,
				"latitude", BigDecimal.valueOf((Double) param.get("lat")),
				"longitude", BigDecimal.valueOf((Double) param.get("lng")),
				"source", param.get("source"),
				"createdBy", userId);
		pinDAO.insertPin(pin);                     // useGeneratedKeys → pin.placeId
		Long placeId = ((Number) pin.get("placeId")).longValue();

		// 등록자를 첫 번째 추천인으로 등록 (한 줄 메모 포함)
		pinDAO.insertRecommendation(ParamUtil.map("placeId", placeId, "userId", userId, "comment", param.get("memo")));

		updateConsensus(placeId, teamId, false);
		return toItem(pinDAO.selectPinById(placeId));
	}

	@Override
	@Transactional
	public Map<String, Object> toggleRecommendation(Long placeId, Long userId) throws Exception {
		pinDAO.lockPin(placeId);   // 같은 핀의 추천 토글은 하나씩 처리한다 (동시 취소 시 마지막 추천 판정 경합 방지)
		Map<String, Object> pin = selectMemberPin(placeId, userId);
		if (pin == null) return null;

		boolean previouslyAchieved = pin.get("consensus_achieved_at") != null;

		Map<String, Object> key = ParamUtil.map("placeId", placeId, "userId", userId);
		if (pinDAO.countRecommendation(key) > 0) {
			pinDAO.deleteRecommendation(key);
			// 마지막 추천자가 취소하면 장소도 지운다 (F-38)
			if (pinDAO.deletePinIfNoRecommendation(placeId) > 0) {
				return ParamUtil.map("pin", null, "deleted", true, "reachedAllApproved", false);
			}
		} else {
			pinDAO.insertRecommendation(ParamUtil.map("placeId", placeId, "userId", userId, "comment", null));
		}

		boolean currentAchieved = updateConsensus(placeId, (Long) pin.get("team_id"), false);

		Map<String, Object> result = new HashMap<>();
		result.put("pin", toItem(pinDAO.selectPinById(placeId)));
		result.put("deleted", false);
		result.put("reachedAllApproved", !previouslyAchieved && currentAchieved);   // 이번 추천으로 처음 달성했을 때만 true
		return result;
	}

	@Override
	@Transactional
	public Map<String, Object> toggleVisit(Long placeId, Long userId) throws Exception {
		if (selectMemberPin(placeId, userId) == null) return null;

		Map<String, Object> key = ParamUtil.map("placeId", placeId, "userId", userId);
		if (pinDAO.countVisit(key) > 0) {
			pinDAO.deleteVisit(key);
		} else {
			pinDAO.insertVisit(key);
		}
		return toItem(pinDAO.selectPinById(placeId));
	}

	@Override
	@Transactional
	public void updateTeamConsensus(Long teamId) throws Exception {
		for (Long placeId : pinDAO.selectPinIdsByTeamId(teamId)) {
			updateConsensus(placeId, teamId, true);
		}
	}

	// 등록자 본인 또는 팀 owner 만 수정·삭제할 수 있다. 팀 멤버가 아니면 없는 핀과 같이 NOT_FOUND
	@Override
	@Transactional(readOnly = true)
	public String selectEditCode(Long placeId, Long userId) throws Exception {
		Map<String, Object> pin = selectMemberPin(placeId, userId);
		if (pin == null) return Constants.NOT_FOUND;
		if (userId.equals(pin.get("created_by"))) return Constants.SUCCESS;

		boolean isOwner = teamDAO.selectTeamMembers((Long) pin.get("team_id")).stream()
				.anyMatch(m -> userId.equals(m.get("user_id")) && "owner".equalsIgnoreCase((String) m.get("role")));
		return isOwner ? Constants.SUCCESS : Constants.NO_PERMISSION;
	}

	@Override
	@Transactional
	public Map<String, Object> updatePin(Long placeId, Map<String, Object> param) throws Exception {
		pinDAO.updatePin(ParamUtil.map("placeId", placeId, "name", param.get("name"), "category", toDbCategory((String) param.get("category"))));

		// 한 줄 추천평은 등록자의 recommendations 행에 들어 있으므로 그쪽을 고친다 (memo 를 보내지 않았으면 그대로 둔다)
		if (param.containsKey("memo")) {
			Map<String, Object> pin = pinDAO.selectPinById(placeId);
			pinDAO.updateRecommendationComment(ParamUtil.map("placeId", placeId, "userId", pin.get("created_by"), "comment", param.get("memo")));
		}
		return toItem(pinDAO.selectPinById(placeId));
	}

	@Override
	@Transactional
	public void deletePin(Long placeId) throws Exception {
		pinDAO.deletePin(placeId);
	}

	// 요청자가 속한 팀의 핀. 없거나 다른 팀의 핀이면 null (존재 여부를 드러내지 않는다)
	private Map<String, Object> selectMemberPin(Long placeId, Long userId) {
		Map<String, Object> pin = pinDAO.selectPinById(placeId);
		if (pin == null || !teamDAO.isTeamMember((Long) pin.get("team_id"), userId)) return null;
		return pin;
	}

	/*
	 * '모두 인정' 달성 여부를 다시 계산해 저장한다. 규칙이 all 이면 팀원 전원, 아니면 consensus_min_count 명.
	 * 팀원이 2명 미만이면 판정하지 않는다 (혼자 등록하자마자 달성되지 않게).
	 * keepRecord: 팀원이 늘어 풀리는 경우 true — 'N명일 때 달성' 기록(consensus_member_count)을 남긴다
	 */
	private boolean updateConsensus(Long placeId, Long teamId, boolean keepRecord) {
		Map<String, Object> team = teamDAO.selectTeamById(teamId);
		if (team == null) return false;

		int memberCount = teamDAO.selectTeamMembers(teamId).size();
		int recCount = pinDAO.countRecommendationsByPlaceId(placeId);

		Object minCount = team.get("consensus_min_count");
		int target = "all".equalsIgnoreCase((String) team.get("consensus_rule"))
				? memberCount
				: (minCount == null ? 2 : ((Number) minCount).intValue());

		boolean achieved = memberCount >= 2 && recCount >= target;
		pinDAO.updateConsensus(ParamUtil.map("placeId", placeId, "achieved", achieved, "memberCount", recCount, "keepRecord", keepRecord));
		return achieved;
	}

	// 화면이 그대로 쓸 수 있는 형태로 변환
	private Map<String, Object> toItem(Map<String, Object> row) {
		Long placeId = (Long) row.get("place_id");

		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(placeId));
		item.put("teamId", String.valueOf(row.get("team_id")));
		item.put("name", row.get("name"));
		item.put("category", toFrontendCategory((String) row.get("category")));
		item.put("address", row.get("address"));
		item.put("roadAddress", row.get("road_address"));
		item.put("lat", toDouble(row.get("latitude")));
		item.put("lng", toDouble(row.get("longitude")));
		item.put("addedBy", row.get("created_by_login_id"));
		item.put("recommenders", pinDAO.selectRecommenderIds(placeId));
		item.put("visitedBy", pinDAO.selectVisitorIds(placeId));
		item.put("memo", row.get("memo"));
		item.put("isAllApproved", row.get("consensus_achieved_at") != null);
		item.put("consensusAchievedAt", toIso(row.get("consensus_achieved_at")));
		item.put("consensusMemberCount", row.get("consensus_member_count"));   // 달성 중이면 달성 인원, 팀원이 늘어 풀렸으면 그때 인원
		item.put("createdAt", toIso(row.get("created_at")));
		return item;
	}

	private Double toDouble(Object v) {
		return (v == null) ? null : ((Number) v).doubleValue();
	}

	// timestamptz 는 HashMap 결과에서 java.sql.Timestamp 로 온다. 프론트가 new Date() 로 읽도록 ISO-8601(UTC) 문자열로 바꾼다
	private String toIso(Object v) {
		if (v == null) return null;
		return (v instanceof Timestamp ts) ? ts.toInstant().toString() : v.toString();
	}

	// 프론트 카테고리 → DB 카테고리 (places.category CHECK 값). 순수 함수라 테스트에서 직접 호출한다
	static String toDbCategory(String cat) {
		if (cat == null || cat.isBlank()) return "etc";
		return switch (cat.toLowerCase().trim()) {
			case "food" -> "restaurant";
			case "drink" -> "bar";
			case "sight" -> "attraction";
			case "play" -> "activity";
			default -> cat.toLowerCase().trim();
		};
	}

	// DB 카테고리 → 프론트 카테고리
	static String toFrontendCategory(String cat) {
		if (cat == null) return "etc";
		return switch (cat.toLowerCase().trim()) {
			case "restaurant" -> "food";
			case "bar" -> "drink";
			case "attraction" -> "sight";
			case "activity" -> "play";
			default -> cat.toLowerCase().trim();
		};
	}
}
