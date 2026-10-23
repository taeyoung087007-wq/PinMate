package com.pinmate.cmmn.util;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

// @RequestBody HashMap 에서 값 꺼내기. 키가 없거나 값이 null 이면 "".
// 숫자 파서는 형식이 틀리면 null 을 돌려주고, Controller 가 INVALID(90)로 응답한다.
public class ParamUtil {

	private static final Pattern INTEGER = Pattern.compile("-?\\d{1,18}");

	private ParamUtil() {
	}

	// 앞뒤 공백 제거 (아이디, 코드, 이름 등)
	public static String str(Map<String, Object> param, String key) {
		return raw(param, key).trim();
	}

	// 공백 유지 (비밀번호)
	public static String raw(Map<String, Object> param, String key) {
		Object value = param == null ? null : param.get(key);
		return value == null ? "" : String.valueOf(value);
	}

	// DAO 에 넘길 파라미터 맵. Map.of 와 달리 null 값을 허용한다(선택 칸).
	// 요청 본문을 그대로 넘기지 않고 이것으로 필요한 값만 담는다(클라이언트가 userId 등을 끼워 넣지 못하게).
	public static Map<String, Object> map(Object... keyValues) {
		Map<String, Object> m = new HashMap<>();
		for (int i = 0; i < keyValues.length; i += 2) {
			m.put((String) keyValues[i], keyValues[i + 1]);
		}
		return m;
	}

	// 정수. 형식 오류·범위 초과는 null
	public static Long lng(Map<String, Object> param, String key) {
		String s = str(param, key);
		return INTEGER.matcher(s).matches() ? Long.valueOf(s) : null;
	}

	// 실수(좌표). 형식 오류·NaN·무한대는 null
	public static Double dbl(Map<String, Object> param, String key) {
		try {
			double v = Double.parseDouble(str(param, key));
			return Double.isFinite(v) ? v : null;
		} catch (NumberFormatException e) {
			return null;
		}
	}
}
