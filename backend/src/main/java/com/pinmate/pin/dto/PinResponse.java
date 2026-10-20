package com.pinmate.pin.dto;

import java.util.List;

public record PinResponse(
    String id,
    String teamId,
    String name,
    String category,
    String address,
    String roadAddress,
    Double lat,
    Double lng,
    String addedBy,
    List<String> recommenders,
    List<String> visitedBy,
    String memo,
    boolean isAllApproved,
    String createdAt
) {}
