package com.pinmate.personal.service.impl;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.personal.dao.PersonalPlaceDAO;
import com.pinmate.personal.service.PersonalPlaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("PersonalPlaceService")
public class PersonalPlaceServiceImpl implements PersonalPlaceService {

	@Autowired
	private PersonalPlaceDAO personalPlaceDAO;

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectList(Long userId) throws Exception {
		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : personalPlaceDAO.selectPersonalPlacesByUserId(userId)) {
			list.add(toItem(row));
		}
		return list;
	}

	@Override
	@Transactional
	public Map<String, Object> insert(Map<String, Object> param, Long userId) throws Exception {
		String address = (String) param.get("address");
		String roadAddress = (String) param.get("roadAddress");

		String visibility = (String) param.get("visibility");
		if (visibility == null) {
			visibility = Boolean.FALSE.equals(param.get("isPublic")) ? "private" : "all";
		}

		Map<String, Object> place = ParamUtil.map(
				"userId", userId,
				"name", param.get("name"),
				"category", toDbCategory((String) param.get("category")),
				"address", address,
				"roadAddress", roadAddress == null ? address : roadAddress,
				"latitude", BigDecimal.valueOf((Double) param.get("lat")),
				"longitude", BigDecimal.valueOf((Double) param.get("lng")),
				"source", param.get("source"),
				"kakaoPlaceId", param.get("kakaoPlaceId"),
				"memo", param.get("memo"),
				"visibility", visibility);
		personalPlaceDAO.insertPersonalPlace(place);   // useGeneratedKeys → place.personalPlaceId
		Long personalPlaceId = ((Number) place.get("personalPlaceId")).longValue();

		return toItem(personalPlaceDAO.selectPersonalPlaceById(personalPlaceId));
	}

	@Override
	@Transactional(readOnly = true)
	public String selectEditCode(Long personalPlaceId, Long userId) throws Exception {
		Map<String, Object> row = personalPlaceDAO.selectPersonalPlaceById(personalPlaceId);
		if (row == null) return Constants.NOT_FOUND;
		return userId.equals(((Number) row.get("user_id")).longValue()) ? Constants.SUCCESS : Constants.NO_PERMISSION;
	}

	@Override
	@Transactional
	public Map<String, Object> update(Long personalPlaceId, Map<String, Object> param) throws Exception {
		personalPlaceDAO.updatePersonalPlace(ParamUtil.map(
				"personalPlaceId", personalPlaceId,
				"name", param.get("name"),
				"category", toDbCategory((String) param.get("category")),
				"memo", param.get("memo")));
		return toItem(personalPlaceDAO.selectPersonalPlaceById(personalPlaceId));
	}

	@Override
	@Transactional
	public Map<String, Object> updateVisibility(Long personalPlaceId, String visibility) throws Exception {
		personalPlaceDAO.updatePersonalVisibility(ParamUtil.map(
				"personalPlaceId", personalPlaceId, "visibility", visibility));
		return toItem(personalPlaceDAO.selectPersonalPlaceById(personalPlaceId));
	}

	@Override
	@Transactional
	public void delete(Long personalPlaceId, Long userId) throws Exception {
		personalPlaceDAO.deletePersonalPlace(ParamUtil.map("personalPlaceId", personalPlaceId, "userId", userId));
	}

	// 화면(핀)이 그대로 쓸 수 있는 형태로 변환. 개인 장소는 추천·모두 인정이 없다
	private Map<String, Object> toItem(Map<String, Object> row) {
		String loginId = (String) row.get("login_id");

		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(row.get("personal_place_id")));
		item.put("name", row.get("name"));
		item.put("category", toFrontendCategory((String) row.get("category")));
		item.put("address", row.get("address"));
		item.put("roadAddress", row.get("road_address"));
		item.put("lat", toDouble(row.get("latitude")));
		item.put("lng", toDouble(row.get("longitude")));
		item.put("kakaoPlaceId", row.get("kakao_place_id"));   // 같은 장소 판별 키. 직접 찍은 핀·기존 행은 null
		item.put("addedBy", loginId);
		// 개인 장소에는 추천 개념이 없다. 다만 상세 패널이 '내가 등록한 장소'로 보고 메모를 고칠 수 있게 본인만 넣는다
		item.put("recommenders", loginId == null ? List.of() : List.of(loginId));
		item.put("memo", row.get("memo"));
		String visibility = (String) row.get("visibility");
		if (visibility == null) {
			visibility = Boolean.TRUE.equals(row.get("is_public")) ? "all" : "private";
		}
		item.put("visibility", visibility);
		item.put("isPublic", !"private".equals(visibility));
		item.put("isAllApproved", false);
		item.put("consensusAchievedAt", null);
		item.put("consensusMemberCount", null);
		item.put("createdAt", toIso(row.get("created_at")));
		item.put("personal", true);
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

	// 프론트 카테고리 → DB 카테고리 (personal_places.category CHECK 값). PinServiceImpl 과 같은 규칙
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
