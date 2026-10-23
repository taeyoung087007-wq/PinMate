package com.pinmate.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 회원가입 요청. 길이 제한은 DB 컬럼(users)과 맞춘다.
 * 검증은 컨트롤러 진입 시점에 걸리므로 서비스에서 다시 확인하지 않는다.
 */
public record SignupRequest(
    @NotBlank(message = "아이디를 입력해주세요.")
    @Size(min = 3, max = 20, message = "아이디는 3~20자로 입력해주세요.")
    String loginId,

    @NotBlank(message = "비밀번호를 입력해주세요.")
    @Size(min = 4, max = 100, message = "비밀번호는 4자 이상 입력해주세요.")
    String password,

    @NotBlank(message = "닉네임을 입력해주세요.")
    @Size(min = 2, max = 30, message = "닉네임은 2~30자로 입력해주세요.")
    String nickname,

    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 100자 이하로 입력해주세요.")
    String email,

    String inviteCode
) {}
