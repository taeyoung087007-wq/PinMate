package com.pinmate.team;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface TeamMapper {

    List<Team> findTeamsByUserId(@Param("userId") Long userId);

    Team findTeamById(@Param("teamId") Long teamId);

    List<TeamMember> findTeamMembersByTeamId(@Param("teamId") Long teamId);

    void insertTeam(Team team);

    void insertTeamMember(
        @Param("teamId") Long teamId,
        @Param("userId") Long userId,
        @Param("role") String role,
        @Param("color") String color
    );
}
