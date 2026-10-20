package com.pinmate.pin.dto;

public record RecommendResponse(
    PinResponse pin,
    boolean reachedAllApproved
) {}
