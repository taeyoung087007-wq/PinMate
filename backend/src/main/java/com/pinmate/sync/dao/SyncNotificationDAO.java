package com.pinmate.sync.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository("syncNotificationDAO")
public class SyncNotificationDAO {

	@Autowired
	private SqlSessionTemplate sqlSession;
	public final static String SQL_PATH = "com.pinmate.sync.dao.SyncNotificationDAO";

	// 팀에 새 장소가 생겼을 때, 행위자를 뺀 팀원 전원에게 알림을 만든다
	public int insertAdded(Map<String, Object> param) {
		return sqlSession.insert(SyncNotificationDAO.SQL_PATH + ".insertAdded", param);
	}

	// 팀 장소가 삭제됐을 때, 내 지도에 같은 장소가 있는 팀원에게만 알림을 만든다
	public int insertDeleted(Map<String, Object> param) {
		return sqlSession.insert(SyncNotificationDAO.SQL_PATH + ".insertDeleted", param);
	}

	// 내 알림 목록 (최근 100건)
	public List<Map<String, Object>> selectNotifications(Long userId) {
		return sqlSession.selectList(SyncNotificationDAO.SQL_PATH + ".selectNotifications", userId);
	}

	// 처리 안 한 알림 수
	public int countPending(Long userId) {
		return sqlSession.selectOne(SyncNotificationDAO.SQL_PATH + ".countPending", userId);
	}

	// 내 알림 한 건 (param: notificationId, userId)
	public Map<String, Object> selectNotification(Map<String, Object> param) {
		return sqlSession.selectOne(SyncNotificationDAO.SQL_PATH + ".selectNotification", param);
	}

	// 상태 바꾸기 (param: notificationId, userId, status)
	public int updateStatus(Map<String, Object> param) {
		return sqlSession.update(SyncNotificationDAO.SQL_PATH + ".updateStatus", param);
	}

	// 팀 단위 일괄 처리 (param: teamId, userId, status)
	public int updateStatusByTeam(Map<String, Object> param) {
		return sqlSession.update(SyncNotificationDAO.SQL_PATH + ".updateStatusByTeam", param);
	}

	// 팀의 처리 안 한 알림 (param: teamId, userId)
	public List<Map<String, Object>> selectPendingByTeam(Map<String, Object> param) {
		return sqlSession.selectList(SyncNotificationDAO.SQL_PATH + ".selectPendingByTeam", param);
	}

	// 장소가 지워지면 그 장소의 처리 안 한 '추가' 알림을 지운다
	public int deletePendingAddedByPin(Long pinId) {
		return sqlSession.delete(SyncNotificationDAO.SQL_PATH + ".deletePendingAddedByPin", pinId);
	}

	// 내 지도에 같은 장소가 있는지 (param: userId, name, latitude, longitude)
	public int countSamePersonalPlace(Map<String, Object> param) {
		return sqlSession.selectOne(SyncNotificationDAO.SQL_PATH + ".countSamePersonalPlace", param);
	}

	// 알림의 장소를 내 지도에 담는다 (이미 있으면 건너뜀)
	public int insertPersonalFromNotification(Map<String, Object> param) {
		return sqlSession.insert(SyncNotificationDAO.SQL_PATH + ".insertPersonalFromNotification", param);
	}

	// 알림의 장소를 내 지도에서 지운다
	public int deleteSamePersonalPlace(Map<String, Object> param) {
		return sqlSession.delete(SyncNotificationDAO.SQL_PATH + ".deleteSamePersonalPlace", param);
	}
}
