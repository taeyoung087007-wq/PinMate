package com.pinmate.team.service.impl;

import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.pin.service.PinService;
import com.pinmate.presence.service.PresenceService;
import com.pinmate.team.TeamColors;
import com.pinmate.team.dao.TeamDAO;
import com.pinmate.team.service.TeamService;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service("TeamService")
public class TeamServiceImpl implements TeamService {

	@Autowired
	private TeamDAO teamDAO;

	@Resource(name = "PresenceService")
	private PresenceService presenceService;

	@Resource(name = "PinService")
	private PinService pinService;

	@Override
	@Transactional(readOnly = true)
	public List<Map<String, Object>> selectTeamList(Long userId) throws Exception {
		List<Map<String, Object>> list = new ArrayList<>();
		for (Map<String, Object> team : teamDAO.selectTeamsByUserId(userId)) {
			list.add(toItem(team, teamDAO.selectTeamMembers((Long) team.get("team_id"))));
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

		return toItem(team, members);
	}

	@Override
	@Transactional
	public Map<String, Object> insertTeam(String name, Long userId) throws Exception {
		Map<String, Object> team = ParamUtil.map("name", name);
		teamDAO.insertTeam(team);                  // useGeneratedKeys → team.teamId
		Long teamId = ((Number) team.get("teamId")).longValue();

		teamDAO.insertTeamMember(ParamUtil.map("teamId", teamId, "userId", userId, "role", "owner", "color", TeamColors.PALETTE.get(0)));

		String inviteCode = "team" + teamId + "_" + UUID.randomUUID().toString().substring(0, 6);
		teamDAO.insertTeamInvite(ParamUtil.map("teamId", teamId, "code", inviteCode, "createdBy", userId));

		return selectTeam(teamId, userId);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<String, Object> selectInvite(String code) throws Exception {
		Map<String, Object> invite = teamDAO.selectInviteByCode(code);
		if (invite == null) return null;

		Map<String, Object> item = new HashMap<>();
		item.put("teamId", invite.get("team_id"));
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
			member.put("color", m.get("color"));
			member.put("avatarColor", m.get("color"));
			member.put("initials", nickname.isBlank() ? "P" : nickname.substring(0, 1));
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
}
