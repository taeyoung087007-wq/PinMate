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

	//팀의 핀 id 목록
	public List<Long> selectPinIdsByTeamId(Long teamId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectPinIdsByTeamId", teamId);
	}

	//핀 단건
	public Map<String, Object> selectPinById(Long placeId) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".selectPinById", placeId);
	}

	//추천인 login_id 목록
	public List<String> selectRecommenderIds(Long placeId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectRecommenderIds", placeId);
	}

	//팀 핀 전체의 추천인 (place_id, login_id)
	public List<Map<String, Object>> selectRecommendersByTeamId(Long teamId) {
		return sqlSession.selectList(PinDAO.SQL_PATH + ".selectRecommendersByTeamId", teamId);
	}

	//같은 팀에 이름이 같고 약 50m 안에 있는 핀 id. 없으면 null (param: teamId, name, latitude, longitude)
	public Long selectSamePinId(Map<String, Object> param) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".selectSamePinId", param);
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

	//'모두 인정' 달성 여부 갱신 (param: placeId, achieved, memberCount, keepRecord)
	public int updateConsensus(Map<String, Object> param) {
		return sqlSession.update(PinDAO.SQL_PATH + ".updateConsensus", param);
	}

	//이름·카테고리 수정 (param: placeId, name, category)
	public int updatePin(Map<String, Object> param) {
		return sqlSession.update(PinDAO.SQL_PATH + ".updatePin", param);
	}

	//등록자 한 줄 추천평 수정 (param: placeId, userId, comment)
	public int updateRecommendationComment(Map<String, Object> param) {
		return sqlSession.update(PinDAO.SQL_PATH + ".updateRecommendationComment", param);
	}

	//핀 삭제 (추천 기록은 CASCADE)
	public int deletePin(Long placeId) {
		return sqlSession.delete(PinDAO.SQL_PATH + ".deletePin", placeId);
	}

	//핀 행 잠금 (트랜잭션 안에서만 의미 있음). 핀이 없으면 null
	public Long lockPin(Long placeId) {
		return sqlSession.selectOne(PinDAO.SQL_PATH + ".lockPin", placeId);
	}
}
