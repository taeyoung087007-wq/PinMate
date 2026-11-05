package com.pinmate.cmmn.util;

import java.sql.Timestamp;

/**
 * DB 조회값(HashMap)을 화면이 쓰는 형태로 바꾸는 공통 변환.
 * 예전엔 서비스 impl 다섯 곳에 같은 함수가 복사돼 있어 카테고리를 하나 추가할 때마다 화면별로 다르게 동작했다.
 */
public final class ValueConverters {

	private ValueConverters() {
	}

	/** 프론트 카테고리 → DB 카테고리 (places·personal_places.category CHECK 값) */
	public static String toDbCategory(String cat) {
		if (cat == null || cat.isBlank()) return "etc";
		return switch (cat.toLowerCase().trim()) {
			case "food" -> "restaurant";
			case "drink" -> "bar";
			case "sight" -> "attraction";
			case "play" -> "activity";
			default -> cat.toLowerCase().trim();
		};
	}

	/** DB 카테고리 → 프론트 카테고리 */
	public static String toFrontendCategory(String cat) {
		if (cat == null) return "etc";
		return switch (cat.toLowerCase().trim()) {
			case "restaurant" -> "food";
			case "bar" -> "drink";
			case "attraction" -> "sight";
			case "activity" -> "play";
			default -> cat.toLowerCase().trim();
		};
	}

	/** 좌표는 NUMERIC 이라 BigDecimal 로 온다. 화면이 숫자로 쓰도록 double 로 바꾼다 */
	public static Double toDouble(Object v) {
		return (v == null) ? null : ((Number) v).doubleValue();
	}

	/** timestamptz 는 java.sql.Timestamp 로 온다. 프론트가 new Date() 로 읽도록 ISO-8601(UTC) 문자열로 바꾼다 */
	public static String toIso(Object v) {
		if (v == null) return null;
		return (v instanceof Timestamp ts) ? ts.toInstant().toString() : v.toString();
	}

	/** NULL 이면 빈 문자열 */
	public static String text(Object v) {
		return (v == null) ? "" : v.toString();
	}
}
