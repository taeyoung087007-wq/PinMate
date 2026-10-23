package com.pinmate.auth.controller;

import com.pinmate.auth.service.AuthService;
import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.LoginAttemptLimiter;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.PasswordUtil;
import com.pinmate.cmmn.util.RequestUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.team.service.TeamService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

// 로그인·가입·로그아웃 (로그인 불필요: /api/auth/**).
// 가입은 서비스 가입 코드가 있어야 하고, 가입 후에는 로그인 화면으로 돌아간다. 팀 참여는 로그인 후 초대 링크로 한다.
@RequestMapping(value = "/api/")
@Controller
public class AuthController {

	private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

	// 길이 제한은 users 컬럼과 맞춘다
	private static final int LOGIN_ID_MIN = 3;
	private static final int LOGIN_ID_MAX = 20;      // users.login_id VARCHAR(20)
	private static final int PASSWORD_MIN = 4;
	private static final int NICKNAME_MIN = 2;
	private static final int NICKNAME_MAX = 30;      // users.nickname VARCHAR(30)
	private static final int EMAIL_MAX = 100;        // users.email VARCHAR(100)
	private static final int INVITE_CODE_MAX = 32;   // team_invites.code VARCHAR(32)
	private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");

	@Resource(name = "AuthService")
	private AuthService authService;

	@Resource(name = "TeamService")
	private TeamService teamService;

	@Autowired
	private LoginAttemptLimiter loginAttemptLimiter;

	@Value("${pinmate.signup-code:}")
	private String signupCode;

	// 팀 초대 링크 미리보기 (어떤 모임인지 보여준다). 코드 추측을 막으려고 참여와 같은 시도 제한을 건다
	@ResponseBody
	@GetMapping("auth/invite/check")
	public Response checkInvite(@RequestParam(name = "code", defaultValue = "") String code, HttpServletRequest request) {
		String inviteCode = code.trim();
		if (inviteCode.isEmpty() || inviteCode.length() > INVITE_CODE_MAX) {
			return Response.of(Constants.INVITE_FAIL);
		}

		String attemptKey = LoginAttemptLimiter.inviteKey(RequestUtil.clientIp(request));
		if (!loginAttemptLimiter.tryAcquire(attemptKey)) {
			return Response.of(Constants.INVITE_BLOCKED);
		}

		Response result = null;

		try {
			Map<String, Object> invite = teamService.selectInvite(inviteCode);
			if (invite == null) {
				result = Response.of(Constants.INVITE_FAIL);
			} else {
				loginAttemptLimiter.reset(attemptKey);
				result = Response.of(Constants.SUCCESS, invite);
			}
		} catch (NullPointerException npe) {
			logger.error("초대 코드 확인 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "초대 코드 확인 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("초대 코드 확인 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "초대 코드 확인 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("초대 코드 확인 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "초대 코드 확인 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 로그인 (loginId, password). 성공하면 세션 ID 를 새로 발급하고 사용자·기본 모임 정보를 돌려준다
	@ResponseBody
	@PostMapping("auth/login")
	public Response login(@RequestBody HashMap<String, Object> param, HttpServletRequest request) {
		String loginId = ParamUtil.str(param, "loginId");
		String password = ParamUtil.raw(param, "password");
		String attemptKey = loginAttemptKey(loginId, RequestUtil.clientIp(request));

		if (!loginAttemptLimiter.tryAcquire(attemptKey)) {
			return Response.of(Constants.LOGIN_BLOCKED);
		}

		Response result = null;

		try {
			Map<String, Object> user = isValidLoginId(loginId) ? authService.selectUserByLoginId(loginId) : null;
			String hash = (user == null) ? null : (String) user.get("password_hash");

			// 계정 없음과 비밀번호 오류를 구분하지 않는다(아이디 존재 여부 노출 방지)
			if (!PasswordUtil.matches(password, hash)) {
				result = Response.of(Constants.LOGIN_FAIL);
			} else {
				Long userId = (Long) user.get("user_id");
				if (PasswordUtil.isLegacy(hash)) {
					authService.updatePasswordHash(ParamUtil.map("userId", userId, "passwordHash", PasswordUtil.hash(password)));
				}
				Map<String, Object> data = authService.selectLoginInfo(user);
				loginAttemptLimiter.reset(attemptKey);
				SessionUtil.login(request, userId, (String) user.get("login_id"));
				result = Response.of(Constants.SUCCESS, data);
			}
		} catch (NullPointerException npe) {
			logger.error("로그인 처리 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "로그인 처리 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("로그인 처리 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "로그인 처리 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("로그인 처리 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "로그인 처리 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 가입 (loginId, password, passwordConfirm, nickname, email, signupCode)
	@ResponseBody
	@PostMapping("auth/signup")
	public Response signup(@RequestBody HashMap<String, Object> param, HttpServletRequest request) {
		String loginId = ParamUtil.str(param, "loginId");
		String password = ParamUtil.raw(param, "password");
		String nickname = ParamUtil.str(param, "nickname");
		String email = ParamUtil.str(param, "email");
		String code = ParamUtil.str(param, "signupCode");

		if (!isValidLoginId(loginId) || loginId.length() < LOGIN_ID_MIN) {
			return Response.invalid("아이디는 3~20자로 입력해주세요.");
		}
		if (password.length() < PASSWORD_MIN || !PasswordUtil.fits(password)) {
			return Response.invalid("비밀번호는 4자 이상 72바이트 이하로 입력해주세요.");
		}
		if (!password.equals(ParamUtil.raw(param, "passwordConfirm"))) {
			return Response.invalid("비밀번호 확인이 일치하지 않습니다.");
		}
		if (nickname.length() < NICKNAME_MIN || nickname.length() > NICKNAME_MAX) {
			return Response.invalid("닉네임은 2~30자로 입력해주세요.");
		}
		if (!email.isEmpty() && (email.length() > EMAIL_MAX || !EMAIL.matcher(email).matches())) {
			return Response.invalid("이메일 형식이 올바르지 않습니다.");
		}

		String attemptKey = LoginAttemptLimiter.signupKey(RequestUtil.clientIp(request));
		if (!loginAttemptLimiter.tryAcquire(attemptKey)) {
			return Response.of(Constants.SIGNUP_BLOCKED);
		}
		// 코드 검사를 중복 검사보다 먼저 — 코드가 없는 사람이 아이디 존재 여부를 알아낼 수 없게
		if (!isSignupCodeValid(code)) {
			return Response.of(Constants.SIGNUP_FAIL_CODE);
		}
		loginAttemptLimiter.reset(attemptKey);

		Response result = null;

		try {
			if (authService.selectUserByLoginId(loginId) != null) {
				result = Response.of(Constants.SIGNUP_FAIL_EXISTS);
			} else if (authService.existsNickname(nickname)) {
				result = Response.of(Constants.SIGNUP_FAIL_NICKNAME);
			} else {
				authService.insertUser(ParamUtil.map(
						"loginId", loginId,
						"email", email.isEmpty() ? loginId + "@pinmate.io" : email,
						"passwordHash", PasswordUtil.hash(password),
						"nickname", nickname));
				logger.info("신규 사용자 {} 가 가입했습니다.", loginId);
				result = Response.of(Constants.SUCCESS);
			}
		} catch (NullPointerException npe) {
			logger.error("가입 처리 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "가입 처리 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("가입 처리 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "가입 처리 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("가입 처리 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "가입 처리 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	@ResponseBody
	@PostMapping("auth/logout")
	public Response logout(HttpServletRequest request) {
		SessionUtil.logout(request);
		return Response.of(Constants.SUCCESS);
	}

	// 시도 제한 키. 검증을 통과하지 못한 아이디(빈 값, 20자 초과)는 넣지 않는다 — 긴 키로 메모리를 채우는 공격 방지
	static String loginAttemptKey(String loginId, String ip) {
		return "login|" + (isValidLoginId(loginId) ? loginId.toLowerCase(Locale.ROOT) : "") + "|" + ip;
	}

	private static boolean isValidLoginId(String loginId) {
		return !loginId.isEmpty() && loginId.length() <= LOGIN_ID_MAX;
	}

	// 환경변수 PINMATE_SIGNUP_CODE 가 비어 있으면 가입 불가. 비교는 상수 시간
	private boolean isSignupCodeValid(String code) {
		if (signupCode == null || signupCode.isBlank()) {
			return false;
		}
		return MessageDigest.isEqual(signupCode.getBytes(StandardCharsets.UTF_8), code.getBytes(StandardCharsets.UTF_8));
	}
}
