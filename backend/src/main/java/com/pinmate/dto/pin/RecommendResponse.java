package com.pinmate.dto.pin;

public record RecommendResponse(
    PinResponse pin,
    boolean reachedAllApproved
) {}
