package com.pinmate.team.dto;

import java.util.List;

public record TeamResponse(
    String id,
    String name,
    String inviteCode,
    int allApprovedCount,
    int pinCount,
    int memberCount,
    List<TeamMemberResponse> members
) {}
