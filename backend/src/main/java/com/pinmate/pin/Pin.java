package com.pinmate.pin;

import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class Pin {
    private Long placeId;
    private Long teamId;
    private String name;
    private String category;
    private String roadAddress;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String source;
    private String sourceLink;
    private Long createdBy;
    private String createdByLoginId;
    private String memo;
    private OffsetDateTime consensusAchievedAt;
    private Integer consensusMemberCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
