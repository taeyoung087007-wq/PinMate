package com.pinmate.auth.domain;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class User {
    private Long userId;
    private String loginId;
    private String email;
    private String passwordHash;
    private String nickname;
    private String status;
    private OffsetDateTime createdAt;
}
