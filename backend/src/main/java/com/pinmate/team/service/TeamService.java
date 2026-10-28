package com.pinmate.team.service;

import java.util.List;
import java.util.Map;

public interface TeamService {

	// 사용자가 속한 팀 목록
	List<Map<String, Object>> selectTeamList(Long userId) throws Exception;

	// 참여 중인 팀 단건. 없거나 참여하지 않은 팀이면 null
	Map<String, Object> selectTeam(Long teamId, Long userId) throws Exception;

	// 팀 생성 (생성자를 owner 로 등록하고 초대 코드 발급)
	Map<String, Object> insertTeam(String name, Long userId) throws Exception;

	// 유효한 초대 코드의 팀 정보 (teamId, teamName). 없거나 만료되면 null
	Map<String, Object> selectInvite(String code) throws Exception;

	// 초대 코드로 팀 참여. 이미 멤버면 그대로 팀 정보를 돌려준다. 코드가 유효하지 않으면 null
	Map<String, Object> joinTeam(String code, Long userId) throws Exception;

	// 팀 삭제. owner 만 가능: SUCCESS / NO_PERMISSION / NOT_FOUND(없거나 멤버가 아님)
	String deleteTeam(Long teamId, Long userId) throws Exception;

	// 팀 나가기: SUCCESS / NOT_FOUND. owner 가 나가면 가장 먼저 들어온 멤버가 owner, 마지막 한 명이 나가면 팀을 지운다
	String leaveTeam(Long teamId, Long userId) throws Exception;
}
