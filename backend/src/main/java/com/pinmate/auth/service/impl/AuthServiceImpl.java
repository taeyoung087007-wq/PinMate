package com.pinmate.auth.service.impl;

import com.pinmate.auth.dao.AuthDAO;
import com.pinmate.auth.service.AuthService;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.team.TeamColors;
import com.pinmate.team.service.TeamService;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service("AuthService")
public class AuthServiceImpl implements AuthService {

	@Autowired
	private AuthDAO authDAO;

	@Resource(name = "TeamService")
	private TeamService teamService;

	@Override
	public Map<String, Object> selectUserByLoginId(String loginId) throws Exception {
		return authDAO.selectUserByLoginId(loginId);
	}

	@Override
	public boolean existsNickname(String nickname) throws Exception {
		return authDAO.selectUserByNickname(nickname) != null;
	}

	@Override
	public void insertUser(Map<String, Object> param) throws Exception {
		authDAO.insertUser(param);
	}

	@Override
	public void updatePasswordHash(Map<String, Object> param) throws Exception {
		authDAO.updatePasswordHash(param);
	}

	@Override
	public Map<String, Object> selectLoginInfo(Map<String, Object> user) throws Exception {
		Long userId = (Long) user.get("user_id");
		String nickname = (user.get("nickname") == null) ? "" : user.get("nickname").toString();
		Map<String, Object> team = authDAO.selectDefaultTeam(userId);

		Map<String, Object> item = new HashMap<>();
		item.put("id", String.valueOf(userId));
		item.put("loginId", user.get("login_id"));
		item.put("nickname", nickname);
		item.put("email", user.get("email"));
		item.put("avatarColor", team == null ? TeamColors.PALETTE.get(0) : team.get("color"));
		item.put("initials", nickname.isEmpty() ? "P" : nickname.substring(0, 1));
		item.put("avatarId", user.get("avatar_id"));
		item.put("avatarBg", user.get("avatar_bg"));
		item.put("defaultTeam", team == null ? null : ParamUtil.map("id", String.valueOf(team.get("team_id")), "name", team.get("name")));
		return item;
	}

	@Override
	public String selectPasswordHash(Long userId) throws Exception {
		return authDAO.selectPasswordHash(userId);
	}

	@Override
	public boolean updateProfile(Map<String, Object> param) throws Exception {
		Map<String, Object> owner = authDAO.selectUserByNickname((String) param.get("nickname"));
		if (owner != null && !owner.get("user_id").equals(param.get("userId"))) {
			return false;
		}
		authDAO.updateProfile(param);
		return true;
	}

	// 모임 나가기·개인기록 삭제·계정 비우기는 함께 성공하거나 함께 실패해야 한다
	@Override
	@Transactional
	public boolean withdrawUser(Long userId) throws Exception {
		if (authDAO.countOwnedTeams(userId) > 0) {
			return false;
		}
		// 탈퇴도 '모임 나가기'와 같은 경로로 처리한다. 모두 인정 재판정·알림 정리·모임장 넘기기가 빠지지 않게
		List<Long> teamIds = authDAO.selectJoinedTeamIds(userId);
		for (Long teamId : teamIds) {
			teamService.leaveTeam(teamId, userId);
		}
		// 친구 관계와 개인 장소·메모를 남기면 탈퇴 후에도 남에게 보인다
		authDAO.deleteTeamMemberships(userId);
		authDAO.deleteFriendships(userId);
		authDAO.deletePersonalPlaces(userId);
		authDAO.withdrawUser(userId);
		return true;
	}
}
