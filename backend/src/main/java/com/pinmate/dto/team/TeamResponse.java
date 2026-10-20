package com.pinmate.dto.team;

import java.util.List;

public record TeamResponse(
    String id,
    String name,
    int allApprovedCount,
    int pinCount,
    int memberCount,
    List<TeamMemberResponse> members
) {}
