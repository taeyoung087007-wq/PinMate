package com.pinmate.auth.dto;

public record SignupRequest(
    String loginId,
    String password,
    String nickname,
    String email,
    String inviteCode
) {}
