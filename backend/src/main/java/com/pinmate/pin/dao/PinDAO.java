package com.pinmate.pin.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository("pinDAO")
public class PinDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.pin.dao.PinDAO";

	//팀의 핀 목록 (최근 등록 순)
	public List<Map<String, Object>> selectPinsByTeamId(Long teamId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectPinsByTeamId", teamId);
	}

	//핀 단건
	public Map<String, Object> selectPinById(Long placeId) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".selectPinById", placeId);
	}

	//추천인 login_id 목록
	public List<String> selectRecommenderIds(Long placeId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectRecommenderIds", placeId);
	}

	//방문자 login_id 목록
	public List<String> selectVisitorIds(Long placeId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectVisitorIds", placeId);
	}

	//핀 등록. 실행 후 param.placeId 에 생성된 키가 들어간다
	public int insertPin(Map<String, Object> param) {
		return sqlSession.insert(PinDAO.SQL_PATH + ".insertPin", param);
	}

	//내 추천 여부 (param: placeId, userId)
	public int countRecommendation(Map<String, Object> param) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".countRecommendation", param);
	}

	//추천 등록 (param: placeId, userId, comment)
	public int insertRecommendation(Map<String, Object> param) {
		return sqlSession.insert(PinDAO.SQL_PATH + ".insertRecommendation", param);
	}

	//추천 취소 (param: placeId, userId)
	public int deleteRecommendation(Map<String, Object> param) {
		return sqlSession.delete(PinDAO.SQL_PATH + ".deleteRecommendation", param);
	}

	//핀의 전체 추천 수
	public int countRecommendationsByPlaceId(Long placeId) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".countRecommendationsByPlaceId", placeId);
	}

	//'모두 인정' 달성 여부 갱신 (param: placeId, achieved, memberCount)
	public int updateConsensus(Map<String, Object> param) {
		return sqlSession.update(PinDAO.SQL_PATH + ".updateConsensus", param);
	}

	//내 방문 여부 (param: placeId, userId)
	public int countVisit(Map<String, Object> param) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".countVisit", param);
	}

	//방문 등록 (param: placeId, userId)
	public int insertVisit(Map<String, Object> param) {
		return sqlSession.insert(PinDAO.SQL_PATH + ".insertVisit", param);
	}

	//방문 취소 (param: placeId, userId)
	public int deleteVisit(Map<String, Object> param) {
		return sqlSession.delete(PinDAO.SQL_PATH + ".deleteVisit", param);
	}
}
