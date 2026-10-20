package com.pinmate.team.dto;

public record TeamMemberResponse(
    String id,
    String nickname,
    String color,
    String avatarColor,
    String initials,
    String role
) {
    public static TeamMemberResponse of(String id, String nickname, String color, String role) {
        String initials = (nickname != null && !nickname.isBlank()) ? nickname.substring(0, 1) : "P";
        return new TeamMemberResponse(id, nickname, color, color, initials, role);
    }
}
