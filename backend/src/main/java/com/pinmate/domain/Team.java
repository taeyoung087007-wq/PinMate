package com.pinmate.domain;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class Team {
    private Long teamId;
    private String name;
    private String consensusRule;
    private Integer consensusMinCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // 통계 필드
    private int pinCount;
    private int allApprovedCount;
    private int memberCount;
}
