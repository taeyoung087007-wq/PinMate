package com.pinmate.dto.auth;

public record AuthResponse(
    String id,
    String loginId,
    String nickname,
    String email,
    String avatarColor,
    String initials,
    JoinedTeamDto defaultTeam
) {
    public record JoinedTeamDto(
        String id,
        String name
    ) {}
}
