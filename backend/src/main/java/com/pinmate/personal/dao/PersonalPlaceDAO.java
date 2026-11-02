package com.pinmate.personal.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository("personalPlaceDAO")
public class PersonalPlaceDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.personal.dao.PersonalPlaceDAO";

	// 내 개인 장소 목록 (최근 등록 순)
	public List<Map<String, Object>> selectPersonalPlacesByUserId(Long userId) {
		return sqlSession.selectList(PersonalPlaceDAO.SQL_PATH + ".selectPersonalPlacesByUserId", userId);
	}

	// 개인 장소 단건
	public Map<String, Object> selectPersonalPlaceById(Long personalPlaceId) {
		return sqlSession.selectOne(PersonalPlaceDAO.SQL_PATH + ".selectPersonalPlaceById", personalPlaceId);
	}

	// 개인 장소 등록. 실행 후 param.personalPlaceId 에 생성된 키가 들어간다
	public int insertPersonalPlace(Map<String, Object> param) {
		return sqlSession.insert(PersonalPlaceDAO.SQL_PATH + ".insertPersonalPlace", param);
	}

	// 이름·카테고리·메모 수정 (param: personalPlaceId, name, category, memo)
	public int updatePersonalPlace(Map<String, Object> param) {
		return sqlSession.update(PersonalPlaceDAO.SQL_PATH + ".updatePersonalPlace", param);
	}

	// 개인 장소 삭제. 소유자 확인을 위해 userId 도 함께 넘긴다 (param: personalPlaceId, userId)
	public int deletePersonalPlace(Map<String, Object> param) {
		return sqlSession.delete(PersonalPlaceDAO.SQL_PATH + ".deletePersonalPlace", param);
	}
}
