package com.pinmate.cmmn.util;

// 결과 코드. 프론트의 CODE(frontend/src/lib/apiClient.js)와 같은 값을 유지한다.
public class Constants {

	public static final String SUCCESS = "00"; // 공통 응답 성공
	public static final String FAIL    = "99"; // 공통 응답 실패

	// 로그인 결과 코드. 계정 없음과 비밀번호 오류를 구분하지 않는다(아이디 존재 여부 노출 방지)
	public static final String LOGIN_FAIL    = "01";
	public static final String LOGIN_BLOCKED = "03"; // 연속 실패로 잠시 차단

	// 가입 결과 코드
	public static final String SIGNUP_FAIL_CODE     = "11"; // 가입 코드 불일치
	public static final String SIGNUP_FAIL_EXISTS   = "12"; // 아이디 중복
	public static final String SIGNUP_BLOCKED       = "13"; // 가입 코드 연속 실패로 잠시 차단
	public static final String SIGNUP_FAIL_NICKNAME = "14"; // 닉네임 중복

	// 팀 초대 결과 코드
	public static final String INVITE_FAIL    = "21"; // 팀 초대 코드 불일치·만료
	public static final String INVITE_BLOCKED = "23"; // 팀 초대 코드 연속 실패로 잠시 차단

	// 장소
	public static final String DUPLICATE_PLACE = "31"; // 같은 모임에 같은 장소가 이미 있음 (data 에 기존 장소)

	// 공통 입력·데이터 결과 코드 (message 에 사용자 문구)
	public static final String INVALID   = "90"; // 입력 오류
	public static final String NOT_FOUND = "91"; // 대상 없음(참여하지 않은 모임 포함, 구분하지 않음)
	public static final String NO_PERMISSION = "92"; // 권한 없음 (예: 등록자·팀 owner 가 아닌 핀 수정·삭제)

	// 세션 키
	public static final String SESSION_USER_ID  = "userId";  // Long, users.user_id
	public static final String SESSION_LOGIN_ID = "loginId";
}
