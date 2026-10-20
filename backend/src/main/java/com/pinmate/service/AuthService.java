package com.pinmate.service;

import com.pinmate.dto.auth.AuthResponse;
import com.pinmate.dto.auth.InviteCheckResponse;
import com.pinmate.dto.auth.LoginRequest;
import com.pinmate.dto.auth.SignupRequest;

/**
 * 인증(초대코드 확인 / 회원가입 / 로그인) 서비스
 */
public interface AuthService {

    /** 초대 코드 유효성 검사 */
    InviteCheckResponse checkInvite(String code);

    /** 신규 회원가입 및 팀 참여/생성 */
    AuthResponse signup(SignupRequest request);

    /** 로그인 */
    AuthResponse login(LoginRequest request);
}
