package com.pinmate.auth.dao;

import com.pinmate.auth.domain.User;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserDao {

    @Select("""
        SELECT user_id, login_id, email, password_hash, nickname, status, created_at
        FROM users
        WHERE login_id = #{identifier}
           OR (CASE WHEN #{identifier} ~ '^[0-9]+$' THEN user_id = #{identifier}::bigint ELSE false END)
        LIMIT 1
    """)
    User findByIdOrLoginId(@Param("identifier") String identifier);

    @Select("""
        SELECT user_id, login_id, email, password_hash, nickname, status, created_at
        FROM users
        WHERE user_id = #{userId}
    """)
    User findById(@Param("userId") Long userId);

    @Select("""
        SELECT user_id, login_id, email, password_hash, nickname, status, created_at
        FROM users
        WHERE login_id = #{loginId}
        LIMIT 1
    """)
    User findByLoginId(@Param("loginId") String loginId);

    @Select("""
        SELECT user_id, login_id, email, password_hash, nickname, status, created_at
        FROM users
        WHERE nickname = #{nickname}
        LIMIT 1
    """)
    User findByNickname(@Param("nickname") String nickname);

    @org.apache.ibatis.annotations.Insert("""
        INSERT INTO users (login_id, email, password_hash, nickname, status, terms_agreed_at, privacy_agreed_at, created_at)
        VALUES (#{loginId}, #{email}, #{passwordHash}, #{nickname}, 'active', now(), now(), now())
    """)
    @org.apache.ibatis.annotations.Options(useGeneratedKeys = true, keyProperty = "userId", keyColumn = "user_id")
    void insertUser(User user);
}
