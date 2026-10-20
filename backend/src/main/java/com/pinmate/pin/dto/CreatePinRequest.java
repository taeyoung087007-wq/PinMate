package com.pinmate.pin.dto;

public record CreatePinRequest(
    String teamId,
    String name,
    String category,
    String address,
    String roadAddress,
    Double lat,
    Double lng,
    String addedBy,
    String memo
) {}
