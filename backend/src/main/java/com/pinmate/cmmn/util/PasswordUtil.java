package com.pinmate.cmmn.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;

// 비밀번호 해시 (BCrypt, 복호화 없음)
public final class PasswordUtil {

	public static final int MAX_BYTES = 72; // BCrypt 입력 한도. 넘으면 encode/matches 가 예외를 던진다

	private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

	// BCrypt 도입 전에 가입한 계정의 SHA-256 해시(16진수 64자)
	private static final Pattern LEGACY_SHA256 = Pattern.compile("[0-9a-fA-F]{64}");

	// 없는 아이디도 BCrypt 비교를 한 번 해서 응답 시간으로 아이디 존재 여부가 드러나지 않게 한다
	private static final String DUMMY_HASH = ENCODER.encode("pinmate-dummy-password");

	private PasswordUtil() {
	}

	public static String hash(String rawPassword) {
		return ENCODER.encode(rawPassword);
	}

	public static boolean fits(String rawPassword) {
		return rawPassword != null && !rawPassword.isEmpty()
				&& rawPassword.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES;
	}

	// 저장된 해시가 없는 계정(시드 데이터 등)은 항상 실패
	public static boolean matches(String rawPassword, String hashedPassword) {
		if (!fits(rawPassword)) {
			return false;
		}
		if (hashedPassword == null) {
			ENCODER.matches(rawPassword, DUMMY_HASH);
			return false;
		}
		if (isLegacy(hashedPassword)) {
			return MessageDigest.isEqual(
					sha256(rawPassword).getBytes(StandardCharsets.UTF_8),
					hashedPassword.toLowerCase().getBytes(StandardCharsets.UTF_8));
		}
		return ENCODER.matches(rawPassword, hashedPassword);
	}

	// 로그인에 성공한 SHA-256 계정은 그 자리에서 BCrypt 로 다시 저장한다
	// ponytail: 기존 SHA-256 계정이 모두 한 번씩 로그인하면 이 분기와 sha256() 은 지워도 된다
	public static boolean isLegacy(String hashedPassword) {
		return hashedPassword != null && LEGACY_SHA256.matcher(hashedPassword).matches();
	}

	private static String sha256(String rawPassword) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 알고리즘을 지원하지 않습니다.", e);
		}
	}
}
