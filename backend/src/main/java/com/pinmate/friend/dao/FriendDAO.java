package com.pinmate.friend.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository("friendDAO")
public class FriendDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.friend.dao.FriendDAO";

	// 수락된 친구 목록 (상대 유저 정보)
	public List<Map<String, Object>> selectFriends(Long userId) {
		return sqlSession.selectList(FriendDAO.SQL_PATH + ".selectFriends", userId);
	}

	// 나에게 온 친구 요청 (보낸 사람 정보)
	public List<Map<String, Object>> selectIncoming(Long userId) {
		return sqlSession.selectList(FriendDAO.SQL_PATH + ".selectIncoming", userId);
	}

	// 내가 보낸 친구 요청 (받는 사람 정보)
	public List<Map<String, Object>> selectOutgoing(Long userId) {
		return sqlSession.selectList(FriendDAO.SQL_PATH + ".selectOutgoing", userId);
	}

	// 활성 사용자 한 명 (친구 요청 대상 확인용). 없으면 null
	public Map<String, Object> selectUserById(Long userId) {
		return sqlSession.selectOne(FriendDAO.SQL_PATH + ".selectUserById", userId);
	}

	// 두 사람 사이의 관계 한 행 (방향 무관). 없으면 null
	public Map<String, Object> selectRelation(Map<String, Object> param) {
		return sqlSession.selectOne(FriendDAO.SQL_PATH + ".selectRelation", param);
	}

	// 친구 요청 저장 (param: requesterId, addresseeId)
	public int insertRequest(Map<String, Object> param) {
		return sqlSession.insert(FriendDAO.SQL_PATH + ".insertRequest", param);
	}

	// 받은 요청 수락 (param: requesterId, addresseeId)
	public int acceptRequest(Map<String, Object> param) {
		return sqlSession.update(FriendDAO.SQL_PATH + ".acceptRequest", param);
	}

	// 관계 삭제 — 거절·요청 취소·끊기를 모두 처리한다 (param: a, b, 방향 무관)
	public int deleteRelation(Map<String, Object> param) {
		return sqlSession.delete(FriendDAO.SQL_PATH + ".deleteRelation", param);
	}

	// 아이디·닉네임으로 사용자 검색 (param: meId, q). 관계 상태도 함께 내려준다
	public List<Map<String, Object>> searchUsers(Map<String, Object> param) {
		return sqlSession.selectList(FriendDAO.SQL_PATH + ".searchUsers", param);
	}

	// 받은 친구 요청 수 (배지용)
	public int countIncoming(Long userId) {
		return sqlSession.selectOne(FriendDAO.SQL_PATH + ".countIncoming", userId);
	}

	// 친구가 공개한 개인 장소 목록 (지도 오버레이용)
	public List<Map<String, Object>> selectPublicPlaces(Long userId) {
		return sqlSession.selectList(FriendDAO.SQL_PATH + ".selectPublicPlaces", userId);
	}
}
