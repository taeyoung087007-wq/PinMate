package com.pinmate.auth.service.impl;

import com.pinmate.auth.dao.AuthDAO;
import com.pinmate.auth.service.AuthService;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.team.TeamColors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service("AuthService")
public class AuthServiceImpl implements AuthService {

	@Autowired
	private AuthDAO authDAO;

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
		item.put("defaultTeam", team == null ? null : ParamUtil.map("id", String.valueOf(team.get("team_id")), "name", team.get("name")));
		return item;
	}
}
