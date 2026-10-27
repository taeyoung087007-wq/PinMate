package com.pinmate.team.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository("teamDAO")
public class TeamDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.team.dao.TeamDAO";

	//사용자가 속한 팀 목록
	public List<Map<String, Object>> selectTeamsByUserId(Long userId) {
		return sqlSession.selectList(TeamDAO.SQL_PATH + ".selectTeamsByUserId", userId);
	}

	//팀 단건
	public Map<String, Object> selectTeamById(Long teamId) {
		return sqlSession.selectOne(TeamDAO.SQL_PATH + ".selectTeamById", teamId);
	}

	//팀 멤버 목록
	public List<Map<String, Object>> selectTeamMembers(Long teamId) {
		return sqlSession.selectList(TeamDAO.SQL_PATH + ".selectTeamMembers", teamId);
	}

	//사용자가 속한 모든 팀의 멤버 (team_id 포함)
	public List<Map<String, Object>> selectTeamMembersByUserId(Long userId) {
		return sqlSession.selectList(TeamDAO.SQL_PATH + ".selectTeamMembersByUserId", userId);
	}

	//팀 멤버 여부
	public boolean isTeamMember(Long teamId, Long userId) {
		Integer count = sqlSession.selectOne(TeamDAO.SQL_PATH + ".countTeamMember", Map.of("teamId", teamId, "userId", userId));
		return count > 0;
	}

	//팀 생성. 실행 후 param.teamId 에 생성된 키가 들어간다
	public int insertTeam(Map<String, Object> param) {
		return sqlSession.insert(TeamDAO.SQL_PATH + ".insertTeam", param);
	}

	//팀 멤버 등록 (param: teamId, userId, role, color)
	public int insertTeamMember(Map<String, Object> param) {
		return sqlSession.insert(TeamDAO.SQL_PATH + ".insertTeamMember", param);
	}

	//유효한 초대 코드 조회 (없거나 만료되면 null)
	public Map<String, Object> selectInviteByCode(String code) {
		return sqlSession.selectOne(TeamDAO.SQL_PATH + ".selectInviteByCode", code);
	}

	//초대 코드 발급 (param: teamId, code, createdBy)
	public int insertTeamInvite(Map<String, Object> param) {
		return sqlSession.insert(TeamDAO.SQL_PATH + ".insertTeamInvite", param);
	}
}
