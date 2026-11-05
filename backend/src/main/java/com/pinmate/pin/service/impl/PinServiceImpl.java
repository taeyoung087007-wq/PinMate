package com.pinmate.pin.service.impl;

import static com.pinmate.cmmn.util.ValueConverters.*;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.personal.dao.PersonalPlaceDAO;
import com.pinmate.pin.dao.PinDAO;
import com.pinmate.pin.service.PinService;
import com.pinmate.sync.service.SyncNotificationService;
import com.pinmate.team.dao.TeamDAO;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("PinService")
public class PinServiceImpl implements PinService {

	@Autowired
	private PinDAO pinDAO;

	@Autowired
	private TeamDAO teamDAO;

	@Autowired
	private PersonalPlaceDAO personalPlaceDAO;

	@Resource(name = "SyncNotificationService")
	private SyncNotificationService syncNotificationService;

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectPinList(Long teamId, Long userId) throws Exception {
		if (!teamDAO.isTeamMember(teamId, userId)) return null;

		// 추천인은 팀 단위로 한 번에 읽는다 (핀마다 조회하면 핀 수만큼 DB 왕복이 늘어난다)
		Map<Long, List<Map<String, Object>>> recommenders = groupByPlace(pinDAO.selectRecommendersByTeamId(teamId));

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : pinDAO.selectPinsByTeamId(teamId)) {
			Long placeId = (Long) row.get("place_id");
			list.add(toItem(row, recommenders.getOrDefault(placeId, List.of())));
		}
		return list;
	}

	@Override
	@Transactional
	public Map<String, Object> insertPin(Map<String, Object> param, Long userId) throws Exception {
		Long teamId = (Long) param.get("teamId");
		if (!teamDAO.isTeamMember(teamId, userId)) return null;

		// 같은 팀의 등록을 한 줄로 세운 뒤 중복을 본다 (버튼 연타로 두 요청이 동시에 와도 하나만 들어가게)
		teamDAO.lockTeam(teamId);
		Map<String, Object> same = ParamUtil.map("teamId", teamId, "name", param.get("name"),
				"latitude", BigDecimal.valueOf((Double) param.get("lat")), "longitude", BigDecimal.valueOf((Double) param.get("lng")),
				"kakaoPlaceId", param.get("kakaoPlaceId"));
		Long sameId = pinDAO.selectSamePinId(same);
		if (sameId != null) {
			return ParamUtil.map("duplicateOf", toItem(pinDAO.selectPinById(sameId)));
		}

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
				"kakaoPlaceId", param.get("kakaoPlaceId"),
				"createdBy", userId);
		pinDAO.insertPin(pin);                     // useGeneratedKeys → pin.placeId
		Long placeId = ((Number) pin.get("placeId")).longValue();

		// 다녀와서 추천한다고 체크했을 때만 등록자를 첫 추천인으로 (SNS 에서 보고 찍어두기만 한 곳은 추천 0명). 한 줄 추천평은 이 추천 행에 저장된다
		if (Boolean.TRUE.equals(param.get("recommend"))) {
			pinDAO.insertRecommendation(ParamUtil.map("placeId", placeId, "userId", userId, "comment", param.get("memo")));
		}

		updateConsensus(placeId, teamId, false);

		// 팀원에게 '장소가 추가됐다'고 알린다 (내 지도에 담을지 나중에 고를 수 있게)
		Map<String, Object> saved = pinDAO.selectPinById(placeId);
		syncNotificationService.notifyPinAdded(teamId, userId, saved);
		return toItem(saved);
	}

	@Override
	@Transactional
	public Map<String, Object> toggleRecommendation(Long placeId, Long userId) throws Exception {
		pinDAO.lockPin(placeId);   // 같은 핀의 추천 토글은 하나씩 처리한다 (동시에 눌러도 모두 인정 판정이 어긋나지 않게)
		Map<String, Object> pin = selectMemberPin(placeId, userId);
		if (pin == null) return null;

		boolean previouslyAchieved = pin.get("consensus_achieved_at") != null;

		Map<String, Object> key = ParamUtil.map("placeId", placeId, "userId", userId);
		if (pinDAO.countRecommendation(key) > 0) {
			pinDAO.deleteRecommendation(key);   // 추천이 0명이 돼도 장소는 남는다 (찍어두기만 한 장소와 같다)
		} else {
			pinDAO.insertRecommendation(ParamUtil.map("placeId", placeId, "userId", userId, "comment", null));
		}

		boolean currentAchieved = updateConsensus(placeId, (Long) pin.get("team_id"), false);

		Map<String, Object> result = new HashMap<>();
		result.put("pin", toItem(pinDAO.selectPinById(placeId)));
		result.put("reachedAllApproved", !previouslyAchieved && currentAchieved);   // 이번 추천으로 처음 달성했을 때만 true
		return result;
	}

	@Override
	@Transactional
	public void updateTeamConsensus(Long teamId) throws Exception {
		Map<String, Object> team = teamDAO.selectTeamById(teamId);
		if (team == null) return;

		int memberCount = teamDAO.selectTeamMembers(teamId).size();
		int target = consensusTarget(team, memberCount);

		// 장소마다 조회·갱신하지 않고 추천 수를 한 번에 읽어 판정한 뒤 UPDATE 도 한 번에 보낸다
		List<Map<String, Object>> rows = new ArrayList<>();
		for (Map<String, Object> count : pinDAO.selectRecommendationCountsByTeamId(teamId)) {
			int recCount = ((Number) count.get("rec_count")).intValue();
			boolean achieved = memberCount >= 2 && recCount >= target;
			rows.add(ParamUtil.map(
					"placeId", count.get("place_id"),
					"achieved", achieved,
					"recCount", recCount,
					"keepRecord", true));
		}
		if (rows.isEmpty()) return;   // VALUES 가 비면 SQL 이 깨지므로 장소가 없으면 그냥 끝낸다
		pinDAO.updateTeamConsensus(ParamUtil.map("rows", rows));
	}

	// 등록자 본인 또는 팀 owner·admin 만 수정·삭제할 수 있다. 팀 멤버가 아니면 없는 핀과 같이 NOT_FOUND
	@Override
	@Transactional(readOnly = true)
	public String selectEditCode(Long placeId, Long userId) throws Exception {
		Map<String, Object> pin = selectMemberPin(placeId, userId);
		if (pin == null) return Constants.NOT_FOUND;
		if (userId.equals(pin.get("created_by"))) return Constants.SUCCESS;

		boolean isManager = teamDAO.selectTeamMembers((Long) pin.get("team_id")).stream()
				.anyMatch(m -> userId.equals(m.get("user_id"))
						&& ("owner".equalsIgnoreCase((String) m.get("role")) || "admin".equalsIgnoreCase((String) m.get("role"))));
		return isManager ? Constants.SUCCESS : Constants.NO_PERMISSION;
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

	// 내 한 줄 추천평 수정. 내가 추천한 핀이 아니면(팀 멤버가 아닌 경우 포함) null
	@Override
	@Transactional
	public Map<String, Object> updateMyComment(Long placeId, Long userId, String comment) throws Exception {
		if (selectMemberPin(placeId, userId) == null) return null;
		int updated = pinDAO.updateRecommendationComment(ParamUtil.map("placeId", placeId, "userId", userId, "comment", comment));
		return updated == 0 ? null : toItem(pinDAO.selectPinById(placeId));
	}

	@Override
	@Transactional
	public void deletePin(Long placeId, Long userId) throws Exception {
		// 알림에 남길 장소 정보를 지우기 전에 읽어둔다
		Map<String, Object> pin = pinDAO.selectPinById(placeId);
		pinDAO.deletePin(placeId);
		if (pin != null) {
			syncNotificationService.notifyPinDeleted((Long) pin.get("team_id"), userId, pin);
		}
	}

	// 내 개인 핀을 팀 지도로 가져온다. 같은 장소는 내 추천으로 합치고, 없으면 새 팀 장소로 등록한다
	@Override
	@Transactional
	public Map<String, Object> importPersonalPlaces(Long teamId, Long userId, List<Long> personalPlaceIds) throws Exception {
		if (!teamDAO.isTeamMember(teamId, userId)) return null;
		if (personalPlaceIds == null || personalPlaceIds.isEmpty()) {
			return ParamUtil.map("imported", 0, "recommended", 0, "skipped", 0);
		}

		// 가져오기를 한 줄로 세운다 (연타로 같은 장소가 두 번 등록되지 않게)
		teamDAO.lockTeam(teamId);

		int imported = 0;
		int recommended = 0;
		int skipped = 0;

		for (Long personalPlaceId : personalPlaceIds) {
			Map<String, Object> place = personalPlaceDAO.selectPersonalPlaceById(personalPlaceId);
			// 내 핀이 아니거나 없으면 건너뛴다
			if (place == null || !userId.equals(((Number) place.get("user_id")).longValue())) {
				skipped++;
				continue;
			}

			Long sameId = pinDAO.selectSamePinId(ParamUtil.map(
					"teamId", teamId,
					"name", place.get("name"),
					"latitude", place.get("latitude"),
					"longitude", place.get("longitude"),
					"kakaoPlaceId", place.get("kakao_place_id")));

			// 이미 팀에 있는 장소면 내 추천만 더한다 (이미 추천했으면 그대로 둔다)
			if (sameId != null) {
				if (pinDAO.countRecommendation(ParamUtil.map("placeId", sameId, "userId", userId)) == 0) {
					pinDAO.insertRecommendation(ParamUtil.map(
							"placeId", sameId, "userId", userId, "comment", place.get("memo")));
					updateConsensus(sameId, teamId, false);
					recommended++;
				} else {
					skipped++;
				}
				continue;
			}

			// 팀에 없는 장소면 새 팀 장소로 등록하고 내 추천을 붙인다
			Map<String, Object> pin = ParamUtil.map(
					"teamId", teamId,
					"name", place.get("name"),
					"category", place.get("category"),
					"address", place.get("address"),
					"roadAddress", place.get("road_address"),
					"latitude", place.get("latitude"),
					"longitude", place.get("longitude"),
					// 개인 장소 조회는 source 를 가져오지 않는다. 팀 장소는 필수라 기본값을 쓴다
					"source", place.get("source") == null ? "search" : place.get("source"),
					"kakaoPlaceId", place.get("kakao_place_id"),
					"createdBy", userId);
			pinDAO.insertPin(pin);
			Long placeId = ((Number) pin.get("placeId")).longValue();
			pinDAO.insertRecommendation(ParamUtil.map(
					"placeId", placeId, "userId", userId, "comment", place.get("memo")));
			updateConsensus(placeId, teamId, false);
			syncNotificationService.notifyPinAdded(teamId, userId, pinDAO.selectPinById(placeId));
			imported++;
		}

		return ParamUtil.map("imported", imported, "recommended", recommended, "skipped", skipped);
	}

	// 요청자가 속한 팀의 핀. 없거나 다른 팀의 핀이면 null (존재 여부를 드러내지 않는다)
	private Map<String, Object> selectMemberPin(Long placeId, Long userId) {
		Map<String, Object> pin = pinDAO.selectPinById(placeId);
		if (pin == null || !teamDAO.isTeamMember((Long) pin.get("team_id"), userId)) return null;
		return pin;
	}

	/*
	 * 장소 하나의 '모두 인정' 달성 여부를 다시 계산해 저장한다 (등록·추천 토글처럼 한 장소만 바뀔 때).
	 * 팀 전체 재판정은 updateTeamConsensus 의 일괄 경로를 쓴다.
	 * keepRecord: 팀원 변동·기준 변경으로 다시 판정할 때 true — 풀려도 'N명일 때 달성' 기록을 남긴다
	 */
	private boolean updateConsensus(Long placeId, Long teamId, boolean keepRecord) {
		Map<String, Object> team = teamDAO.selectTeamById(teamId);
		if (team == null) return false;

		int memberCount = teamDAO.selectTeamMembers(teamId).size();
		int target = consensusTarget(team, memberCount);
		int recCount = pinDAO.countRecommendationsByPlaceId(placeId);

		boolean achieved = memberCount >= 2 && recCount >= target;
		pinDAO.updateConsensus(ParamUtil.map("placeId", placeId, "achieved", achieved, "memberCount", recCount, "keepRecord", keepRecord));
		return achieved;
	}

	/**
	 * 달성에 필요한 추천 인원. all 이면 팀원 전원, min_count 면 팀원 수를 넘지 않는 선에서 기준 인원
	 * (팀원이 기준보다 적으면 전원 — 사람이 줄어 영영 달성하지 못하는 일이 없게).
	 * 팀원 2명 미만 판정은 호출부가 한다 (혼자 등록하자마자 달성되지 않게).
	 */
	static int consensusTarget(Map<String, Object> team, int memberCount) {
		Object minCount = team.get("consensus_min_count");
		return "all".equalsIgnoreCase((String) team.get("consensus_rule"))
				? memberCount
				: Math.min(minCount == null ? 2 : ((Number) minCount).intValue(), memberCount);
	}

	// 핀 한 개 변환 (등록·수정·추천 응답). 추천인을 이 핀만 조회한다
	private Map<String, Object> toItem(Map<String, Object> row) {
		return toItem(row, pinDAO.selectRecommendersByPlaceId((Long) row.get("place_id")));
	}

	// 추천인 행을 핀별로 묶는다. 행 순서(추천 순)는 유지된다
	private static Map<Long, List<Map<String, Object>>> groupByPlace(List<Map<String, Object>> rows) {
		return rows.stream().collect(Collectors.groupingBy(r -> (Long) r.get("place_id")));
	}

	// 화면이 그대로 쓸 수 있는 형태로 변환. recommenderRows: (login_id, comment) 추천 순
	private Map<String, Object> toItem(Map<String, Object> row, List<Map<String, Object>> recommenderRows) {
		Long placeId = (Long) row.get("place_id");

		List<String> recommenders = new ArrayList<>();
		Map<String, Object> comments = new LinkedHashMap<>();   // 평을 남긴 추천인만 (login_id → 한 줄 평)
		for (Map<String, Object> r : recommenderRows) {
			String loginId = (String) r.get("login_id");
			recommenders.add(loginId);
			if (r.get("comment") != null) comments.put(loginId, r.get("comment"));
		}

		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(placeId));
		item.put("teamId", String.valueOf(row.get("team_id")));
		item.put("name", row.get("name"));
		item.put("category", toFrontendCategory((String) row.get("category")));
		item.put("address", row.get("address"));
		item.put("roadAddress", row.get("road_address"));
		item.put("lat", toDouble(row.get("latitude")));
		item.put("lng", toDouble(row.get("longitude")));
		item.put("kakaoPlaceId", row.get("kakao_place_id"));   // 같은 장소 판별 키. 직접 찍은 핀·기존 행은 null
		item.put("addedBy", row.get("created_by_login_id"));
		item.put("recommenders", recommenders);
		item.put("comments", comments);
		item.put("memo", row.get("memo"));
		item.put("isAllApproved", row.get("consensus_achieved_at") != null);
		item.put("consensusAchievedAt", toIso(row.get("consensus_achieved_at")));
		item.put("consensusMemberCount", row.get("consensus_member_count"));   // 달성 중이면 달성 인원, 팀원이 늘어 풀렸으면 그때 인원
		item.put("createdAt", toIso(row.get("created_at")));
		return item;
	}

}
