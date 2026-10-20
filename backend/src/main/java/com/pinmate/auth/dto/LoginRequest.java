package com.pinmate.auth.dto;

public record LoginRequest(
    String loginId,
    String password
) {}
