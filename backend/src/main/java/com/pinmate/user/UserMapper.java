package com.pinmate.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {

    @Select("""
        SELECT user_id, login_id, email, nickname, status, created_at
        FROM users
        WHERE login_id = #{identifier}
           OR (CASE WHEN #{identifier} ~ '^[0-9]+$' THEN user_id = #{identifier}::bigint ELSE false END)
        LIMIT 1
    """)
    User findByIdOrLoginId(@Param("identifier") String identifier);

    @Select("""
        SELECT user_id, login_id, email, nickname, status, created_at
        FROM users
        WHERE user_id = #{userId}
    """)
    User findById(@Param("userId") Long userId);
}
