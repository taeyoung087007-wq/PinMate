package com.pinmate.domain;

import lombok.Data;

@Data
public class TeamMember {
    private Long teamId;
    private Long userId;
    private String loginId;
    private String nickname;
    private String role;
    private String color;
}
