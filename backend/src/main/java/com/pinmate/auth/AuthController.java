package com.pinmate.auth;

import com.pinmate.auth.dto.*;
import com.pinmate.common.ApiResponse;
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
    public ApiResponse<AuthResponse> signup(@RequestBody SignupRequest request) {
        return ApiResponse.ok(authService.signup(request));
    }

    /**
     * 로그인 API
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }
}
