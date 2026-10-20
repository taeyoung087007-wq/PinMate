package com.pinmate.dto.auth;

public record InviteCheckResponse(
    boolean valid,
    Long teamId,
    String teamName,
    String message
) {
    public static InviteCheckResponse success(Long teamId, String teamName) {
        return new InviteCheckResponse(true, teamId, teamName, "유효한 초대 코드입니다.");
    }

    public static InviteCheckResponse invalid(String message) {
        return new InviteCheckResponse(false, null, null, message);
    }
}
