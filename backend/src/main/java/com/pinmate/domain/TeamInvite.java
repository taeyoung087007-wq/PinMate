package com.pinmate.domain;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class TeamInvite {
    private Long inviteId;
    private Long teamId;
    private String teamName;
    private String code;
    private Long createdBy;
    private OffsetDateTime expiresAt;
    private OffsetDateTime revokedAt;
    private OffsetDateTime createdAt;
}
