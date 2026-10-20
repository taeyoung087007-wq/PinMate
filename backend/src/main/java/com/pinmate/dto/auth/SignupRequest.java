package com.pinmate.dto.auth;

public record SignupRequest(
    String loginId,
    String password,
    String nickname,
    String email,
    String inviteCode
) {}
