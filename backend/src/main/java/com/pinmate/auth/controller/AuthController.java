package com.pinmate.auth.controller;

import jakarta.validation.Valid;
import com.pinmate.auth.service.AuthService;

import com.pinmate.auth.dto.*;
import com.pinmate.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 초대 코드 유효성 확인 API
     * GET /api/auth/invite/check?code=seongsu123
     */
    @GetMapping("/invite/check")
    public ApiResponse<InviteCheckResponse> checkInvite(@RequestParam(name = "code") String code) {
        return ApiResponse.ok(authService.checkInvite(code));
    }

    /**
     * 회원가입 API
     * POST /api/auth/signup
     */
    @PostMapping("/signup")
    public ApiResponse<AuthResponse> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        return ApiResponse.ok(startSession(authService.signup(request), httpRequest));
    }

    /**
     * 로그인 API
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ApiResponse.ok(startSession(authService.login(request), httpRequest));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ApiResponse.ok(null);
    }

    private AuthResponse startSession(AuthResponse user, HttpServletRequest request) {
        HttpSession session = request.getSession();
        request.changeSessionId();
        session.setAttribute("userId", Long.valueOf(user.id()));
        return user;
    }
}
