package com.pinmate.auth.service;

import java.util.Map;

public interface AuthService {

	// 로그인 계정 정보 (user_id, login_id, email, password_hash, nickname, avatar_id, avatar_bg). 없거나 탈퇴했으면 null
	Map<String, Object> selectUserByLoginId(String loginId) throws Exception;

	boolean existsNickname(String nickname) throws Exception;

	// 가입 (param: loginId, email, passwordHash, nickname). 팀 참여는 로그인 후 초대 링크로 따로 한다
	void insertUser(Map<String, Object> param) throws Exception;

	// 비밀번호 해시 교체 (param: userId, passwordHash)
	void updatePasswordHash(Map<String, Object> param) throws Exception;

	// 로그인 응답 (id, loginId, nickname, email, avatarColor, initials, avatarId, avatarBg, defaultTeam)
	Map<String, Object> selectLoginInfo(Map<String, Object> user) throws Exception;

	// 현재 비밀번호 해시. 탈퇴했거나 없으면 null
	String selectPasswordHash(Long userId) throws Exception;

	// 프로필 수정 (param: userId, nickname, avatarId, avatarBg). 닉네임을 다른 사용자가 쓰고 있으면 바꾸지 않고 false
	boolean updateProfile(Map<String, Object> param) throws Exception;

	// 탈퇴. owner 인 모임이 있으면 아무것도 바꾸지 않고 false
	boolean withdrawUser(Long userId) throws Exception;
}
