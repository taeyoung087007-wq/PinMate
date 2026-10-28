package com.pinmate.auth.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Map;

@Repository("authDAO")
public class AuthDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.auth.dao.AuthDAO";

	//로그인 계정 정보 조회 (login_id 기준)
	public Map<String, Object> selectUserByLoginId(String loginId) {
		return sqlSession.selectOne(AuthDAO.SQL_PATH + ".selectUserByLoginId", loginId);
	}

	//닉네임 중복 확인용
	public Map<String, Object> selectUserByNickname(String nickname) {
		return sqlSession.selectOne(AuthDAO.SQL_PATH + ".selectUserByNickname", nickname);
	}

	//가입 (param: loginId, email, passwordHash, nickname)
	public int insertUser(Map<String, Object> param) {
		return sqlSession.insert(AuthDAO.SQL_PATH + ".insertUser", param);
	}

	//비밀번호 해시 교체 (param: userId, passwordHash)
	public int updatePasswordHash(Map<String, Object> param) {
		return sqlSession.update(AuthDAO.SQL_PATH + ".updatePasswordHash", param);
	}

	//비밀번호 해시 조회 (user_id 기준). 탈퇴했거나 없으면 null
	public String selectPasswordHash(Long userId) {
		return sqlSession.selectOne(AuthDAO.SQL_PATH + ".selectPasswordHash", userId);
	}

	//프로필 수정 (param: userId, nickname, avatarId, avatarBg)
	public int updateProfile(Map<String, Object> param) {
		return sqlSession.update(AuthDAO.SQL_PATH + ".updateProfile", param);
	}

	//내가 owner 인 모임 수
	public int countOwnedTeams(Long userId) {
		return sqlSession.selectOne(AuthDAO.SQL_PATH + ".countOwnedTeams", userId);
	}

	//모든 모임에서 나가기
	public int deleteTeamMemberships(Long userId) {
		return sqlSession.delete(AuthDAO.SQL_PATH + ".deleteTeamMemberships", userId);
	}

	//탈퇴 (개인정보 비우고 status = 'withdrawn')
	public int withdrawUser(Long userId) {
		return sqlSession.update(AuthDAO.SQL_PATH + ".withdrawUser", userId);
	}

	//로그인 직후 열 기본 모임 (참여한 모임이 없으면 null)
	public Map<String, Object> selectDefaultTeam(Long userId) {
		return sqlSession.selectOne(AuthDAO.SQL_PATH + ".selectDefaultTeam", userId);
	}
}
