package com.pinmate.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class PasswordUtil {

    private PasswordUtil() {}

    public static String hash(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘을 지원하지 않습니다.", e);
        }
    }

    public static boolean matches(String rawPassword, String hashedPassword) {
        // hash() 는 공백 입력에 null 을 돌려주므로, 여기서 먼저 걸러야 NPE 가 나지 않는다
        if (rawPassword == null || rawPassword.isBlank() || hashedPassword == null) return false;
        return hash(rawPassword).equalsIgnoreCase(hashedPassword);
    }
}
