package com.pinmate.team.service.impl;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.sync.service.SyncNotificationService;
import com.pinmate.team.TeamColors;
import com.pinmate.team.dao.TeamDAO;
import com.pinmate.team.service.TeamService;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("TeamService")
public class TeamServiceImpl implements TeamService {

	// 초대 코드 문자. 손으로 옮겨 적을 때 헷갈리는 i l o 0 1 은 뺐다 (31자 × 16자리 ≈ 79비트)
	private static final String INVITE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
	private static final int INVITE_LENGTH = 16;
	private static final SecureRandom RANDOM = new SecureRandom();

	@Autowired
	private TeamDAO teamDAO;

	@Resource(name = "PresenceService")
	private PresenceService presenceService;

	@Resource(name = "PinService")
	private PinService pinService;

	@Resource(name = "SyncNotificationService")
	private SyncNotificationService syncNotificationService;

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectTeamList(Long userId) throws Exception {
		// 멤버는 내 모든 팀 것을 한 번에 읽어 팀별로 나눈다 (팀마다 조회하면 팀 수만큼 DB 왕복이 늘어난다)
		Map<Long, List<Map<String, Object>>> membersByTeam = teamDAO.selectTeamMembersByUserId(userId).stream()
				.collect(Collectors.groupingBy(m -> (Long) m.get("team_id")));

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> team : teamDAO.selectTeamsByUserId(userId)) {
			list.add(toItem(team, membersByTeam.getOrDefault((Long) team.get("team_id"), List.of())));
		}
		return list;
	}

	// 참여하지 않은 팀은 없는 팀과 같이 null 로 돌려준다 (팀 존재 여부를 드러내지 않는다)
	@Override
	@Transactional(readOnly = true)
	public Map<String, Object> selectTeam(Long teamId, Long userId) throws Exception {
		Map<String, Object> team = teamDAO.selectTeamById(teamId);
		if (team == null) return null;

		List<Map<String, Object>> members = teamDAO.selectTeamMembers(teamId);
		if (!isMember(members, userId)) return null;

		Map<String, Object> item = toItem(team, members);
		// 이 모임에서 내가 '내 지도에도 자동 저장'을 켰는지 (사람마다 다르다)
		item.put("mySyncToPersonal", Boolean.TRUE.equals(teamDAO.selectSyncSetting(teamId, userId)));
		return item;
	}

	@Override
	@Transactional
	public boolean updateSyncSetting(Long teamId, Long userId, boolean syncToPersonal) throws Exception {
		// 멤버가 아니면 바뀐 행이 없어 false 가 된다
		return teamDAO.updateSyncSetting(teamId, userId, syncToPersonal) > 0;
	}

	// 모임원이 공개한 개인 장소. 모임원이 아니면 null (팀 존재 여부를 드러내지 않는다)	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectTeamPublicPlaces(Long teamId, Long userId) throws Exception {
		if (!teamDAO.isTeamMember(teamId, userId)) return null;

		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> row : teamDAO.selectTeamPublicPlaces(teamId, userId)) {
			Map<String, Object> item = new HashMap<>();
			// 팀 핀·친구 핀 id 와 섞이지 않도록 접두어를 붙인다
			item.put("id", "m-" + row.get("personal_place_id"));
			item.put("name", row.get("name"));
			item.put("category", toFrontendCategory((String) row.get("category")));
			item.put("address", row.get("address"));
			item.put("roadAddress", row.get("road_address"));
			item.put("lat", toDouble(row.get("latitude")));
			item.put("lng", toDouble(row.get("longitude")));
			item.put("kakaoPlaceId", row.get("kakao_place_id"));   // 같은 장소 판별 키. 직접 찍은 핀·기존 행은 null
			item.put("memo", row.get("memo"));
			item.put("ownerId", String.valueOf(row.get("user_id")));
			item.put("owner", row.get("nickname"));
			item.put("ownerLoginId", row.get("login_id"));
			item.put("ownerColor", row.get("avatar_bg"));
			item.put("personal", true);
			item.put("isPublic", true);
			list.add(item);
		}
		return list;
	}

	@Override
	@Transactional
	public Map<String, Object> insertTeam(String name, Long userId) throws Exception {		Map<String, Object> team = ParamUtil.map("name", name);
		teamDAO.insertTeam(team);                  // useGeneratedKeys → team.teamId
		Long teamId = ((Number) team.get("teamId")).longValue();

		teamDAO.insertTeamMember(ParamUtil.map("teamId", teamId, "userId", userId, "role", "owner", "color", TeamColors.PALETTE.get(0)));

		teamDAO.insertTeamInvite(ParamUtil.map("teamId", teamId, "code", newInviteCode(), "createdBy", userId));

		return selectTeam(teamId, userId);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<String, Object> selectInvite(String code) throws Exception {
		Map<String, Object> invite = teamDAO.selectInviteByCode(code);
		if (invite == null) return null;

		Map<String, Object> item = new HashMap<>();
		item.put("teamId", String.valueOf(invite.get("team_id"))); // 다른 API 처럼 문자열
		item.put("teamName", invite.get("team_name"));
		return item;
	}

	@Override
	@Transactional
	public Map<String, Object> joinTeam(String code, Long userId) throws Exception {
		Map<String, Object> invite = teamDAO.selectInviteByCode(code);
		if (invite == null) return null;

		Long teamId = (Long) invite.get("team_id");
		List<Map<String, Object>> members = teamDAO.selectTeamMembers(teamId);
		if (!isMember(members, userId)) {
			teamDAO.insertTeamMember(ParamUtil.map("teamId", teamId, "userId", userId, "role", "member", "color", TeamColors.pickUnused(members)));
			// 기준 인원이 늘었으니 이미 달성한 '모두 인정'도 다시 판정한다
			pinService.updateTeamConsensus(teamId);
		}
		return selectTeam(teamId, userId);
	}

	@Override
	@Transactional
	public String reissueInvite(Long teamId, Long userId) throws Exception {
		teamDAO.lockTeam(teamId);   // 동시에 두 번 눌러도 활성 코드가 하나만 남게
		Map<String, Object> me = selectMembership(teamId, userId);
		if (me == null) return Constants.NOT_FOUND;
		if (!isOwner(me) && !isAdmin(me)) return Constants.NO_PERMISSION;

		teamDAO.revokeTeamInvites(teamId);
		teamDAO.insertTeamInvite(ParamUtil.map("teamId", teamId, "code", newInviteCode(), "createdBy", userId));
		return Constants.SUCCESS;
	}

	@Override
	@Transactional
	public String updateMemberRole(Long teamId, Long userId, String targetLoginId, String role) throws Exception {
		List<Map<String, Object>> members = teamDAO.selectTeamMembers(teamId);
		Map<String, Object> me = members.stream().filter(m -> userId.equals(m.get("user_id"))).findFirst().orElse(null);
		if (me == null) return Constants.NOT_FOUND;
		if (!isOwner(me)) return Constants.NO_PERMISSION;

		Map<String, Object> target = members.stream().filter(m -> targetLoginId.equals(m.get("login_id"))).findFirst().orElse(null);
		if (target == null) return Constants.NOT_FOUND;
		if (isOwner(target)) return Constants.NO_PERMISSION;   // 모임장 자신은 바꿀 수 없다 (넘기기는 나가기로만)

		teamDAO.updateMemberRole(ParamUtil.map("teamId", teamId, "userId", target.get("user_id"), "role", role));
		return Constants.SUCCESS;
	}

	@Override
	@Transactional
	public String deleteTeam(Long teamId, Long userId) throws Exception {
		Map<String, Object> me = selectMembership(teamId, userId);
		if (me == null) return Constants.NOT_FOUND;
		if (!isOwner(me)) return Constants.NO_PERMISSION;

		teamDAO.deleteTeam(teamId);
		return Constants.SUCCESS;
	}

	@Override
	@Transactional
	public String leaveTeam(Long teamId, Long userId) throws Exception {
		teamDAO.lockTeam(teamId);   // 둘이 동시에 나가도 owner 넘기기·마지막 인원 판정이 어긋나지 않게
		Map<String, Object> me = selectMembership(teamId, userId);
		if (me == null) return Constants.NOT_FOUND;

		teamDAO.deleteTeamMember(ParamUtil.map("teamId", teamId, "userId", userId));
		syncNotificationService.deleteForLeftMember(teamId, userId);   // 나간 모임의 알림은 남기지 않는다
		if (teamDAO.selectTeamMembers(teamId).isEmpty()) {
			teamDAO.deleteTeam(teamId);   // 아무도 없는 팀은 남기지 않는다
			return Constants.SUCCESS;
		}
		if (isOwner(me)) {
			teamDAO.updateOldestMemberToOwner(teamId);
		}
		// 기준 인원이 줄었으니 '모두 인정'을 다시 판정한다
		pinService.updateTeamConsensus(teamId);
		return Constants.SUCCESS;
	}

	// 요청자의 팀 멤버 행. 없는 팀이거나 멤버가 아니면 null
	private Map<String, Object> selectMembership(Long teamId, Long userId) {
		return teamDAO.selectTeamMembers(teamId).stream()
				.filter(m -> userId.equals(m.get("user_id")))
				.findFirst().orElse(null);
	}

	private boolean isOwner(Map<String, Object> member) {
		return "owner".equalsIgnoreCase((String) member.get("role"));
	}

	private boolean isAdmin(Map<String, Object> member) {
		return "admin".equalsIgnoreCase((String) member.get("role"));
	}

	// 추측하기 어려운 초대 코드. 팀 ID 같은 짐작 가능한 값은 넣지 않는다. 순수 함수라 테스트에서 직접 호출한다
	static String newInviteCode() {
		StringBuilder code = new StringBuilder(INVITE_LENGTH);
		for (int i = 0; i < INVITE_LENGTH; i++) {
			code.append(INVITE_ALPHABET.charAt(RANDOM.nextInt(INVITE_ALPHABET.length())));
		}
		return code.toString();
	}

	private boolean isMember(List<Map<String, Object>> members, Long userId) {
		return members.stream().anyMatch(m -> userId.equals(m.get("user_id")));
	}

	// 화면이 그대로 쓸 수 있는 형태로 변환
	private Map<String, Object> toItem(Map<String, Object> team, List<Map<String, Object>> members) {
		List<Map<String, Object>> memberList = new ArrayList<>();
		for (Map<String, Object> m : members) {
			String nickname = text(m.get("nickname"));
			Map<String, Object> member = new HashMap<>();
			member.put("id", text(m.get("login_id")));
			member.put("nickname", nickname);
			// color·avatarColor: 모임 안에서 겹치지 않는 팀 색 (지도 핀·필터 점). avatarId·avatarBg: 설정에서 고른 프로필 (멤버 동그라미)
			member.put("color", m.get("color"));
			member.put("avatarColor", m.get("color"));
			member.put("initials", nickname.isBlank() ? "P" : nickname.substring(0, 1));
			member.put("avatarId", m.get("avatar_id"));
			member.put("avatarBg", m.get("avatar_bg"));
			member.put("role", m.get("role"));
			member.put("online", presenceService.isOnline((Long) m.get("user_id")));
			memberList.add(member);
		}

		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(team.get("team_id")));
		item.put("name", team.get("name"));
		item.put("inviteCode", team.get("invite_code"));     // 유효한 코드가 없으면 null
		item.put("allApprovedCount", team.get("all_approved_count"));
		item.put("pinCount", team.get("pin_count"));
		item.put("memberCount", members.size());
		item.put("members", memberList);
		return item;
	}

	private String text(Object v) {
		return (v == null) ? "" : v.toString();
	}

	// 개인 장소 카테고리는 저장 값이 제각각이라 화면 값으로 맞춘다
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

	// 좌표는 NUMERIC 이라 BigDecimal 로 온다. 화면이 숫자로 쓰도록 double 로 바꾼다
	private static Double toDouble(Object v) {
		return (v == null) ? null : ((Number) v).doubleValue();
	}
}
