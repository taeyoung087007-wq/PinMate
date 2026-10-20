package com.pinmate.dto.auth;

public record LoginRequest(
    String loginId,
    String password
) {}
