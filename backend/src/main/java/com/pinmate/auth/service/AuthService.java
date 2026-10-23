package com.pinmate.auth.service;

import java.util.Map;

public interface AuthService {

	// 로그인 계정 정보 (user_id, login_id, email, password_hash, nickname). 없으면 null
	Map<String, Object> selectUserByLoginId(String loginId) throws Exception;

	boolean existsNickname(String nickname) throws Exception;

	// 가입 (param: loginId, email, passwordHash, nickname). 팀 참여는 로그인 후 초대 링크로 따로 한다
	void insertUser(Map<String, Object> param) throws Exception;

	// 비밀번호 해시 교체 (param: userId, passwordHash)
	void updatePasswordHash(Map<String, Object> param) throws Exception;

	// 로그인 응답 (id, loginId, nickname, email, avatarColor, initials, defaultTeam)
	Map<String, Object> selectLoginInfo(Map<String, Object> user) throws Exception;
}
