package com.pinmate.personal.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.personal.service.PersonalPlaceService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

// 개인 지도(내 지도) 장소. 로그인 필요(/api/** 인터셉터). 본인 장소만 조회·수정·삭제한다.
@RequestMapping(value = "/api/")
@Controller
public class PersonalPlaceController {

	private static final Logger logger = LoggerFactory.getLogger(PersonalPlaceController.class);

	// 길이 제한은 personal_places 컬럼과 맞춘다
	private static final int NAME_MAX = 100;
	private static final int ADDRESS_MAX = 200;
	private static final int MEMO_MAX = 100;

	// 남의 장소·없는 장소 모두 같은 문구. 장소 ID 존재 여부가 새지 않게 한다
	private static final String EDIT_FAIL_MESSAGE = "장소를 찾을 수 없습니다.";

	// 프론트 카테고리 키 (frontend categories.js 의 CATEGORY_META). 빈 값은 서비스에서 etc 로 저장한다
	private static final Set<String> CATEGORIES = Set.of("food", "cafe", "drink", "stay", "sight", "play", "etc");

	// 공개 범위: 나만 / 친구 전체 / 모임만 / 전체
	private static final Set<String> VISIBILITIES = Set.of("private", "friends", "team", "all");

	@Resource(name = "PersonalPlaceService")
	private PersonalPlaceService personalPlaceService;

	// 내 개인 장소 목록
	@ResponseBody
	@GetMapping("personal/places")
	public Response list(HttpSession session) {
		Response result = null;

		try {
			List<Map<String, Object>> data = personalPlaceService.selectList(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("개인 장소 목록 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "내 지도 목록 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("개인 장소 목록 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "내 지도 목록 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("개인 장소 목록 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "내 지도 목록 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 개인 장소 등록 (name, category, address, roadAddress, lat, lng, memo, source)
	@ResponseBody
	@PostMapping("personal/places")
	public Response insert(@RequestBody HashMap<String, Object> param, HttpSession session) {
		String name = ParamUtil.str(param, "name");
		String category = ParamUtil.str(param, "category");
		String address = ParamUtil.str(param, "address");
		String roadAddress = ParamUtil.str(param, "roadAddress");
		Double lat = ParamUtil.dbl(param, "lat");
		Double lng = ParamUtil.dbl(param, "lng");
		String memo = ParamUtil.str(param, "memo");
		String kakaoPlaceId = ParamUtil.str(param, "kakaoPlaceId");
		// 공개 범위를 안 보내면 예전처럼 공개(전체)로 둔다. isPublic=false 만 비공개
		String visibility = ParamUtil.str(param, "visibility");
		if (visibility.isEmpty()) {
			visibility = Boolean.FALSE.equals(param.get("isPublic")) ? "private" : "all";
		}

		if (name.isEmpty() || name.length() > NAME_MAX) {
			return Response.invalid("장소 이름은 100자 이하로 입력해주세요.");
		}
		if (!isValidCategory(category)) {
			return Response.invalid("카테고리 값이 올바르지 않습니다.");
		}
		if (!isValidVisibility(visibility)) {
			return Response.invalid("공개 범위 값이 올바르지 않습니다.");
		}
		if (address.length() > ADDRESS_MAX || roadAddress.length() > ADDRESS_MAX) {
			return Response.invalid("주소는 200자 이하로 입력해주세요.");
		}
		if (lat == null || lat < -90 || lat > 90 || lng == null || lng < -180 || lng > 180) {
			return Response.invalid("좌표 값이 올바르지 않습니다.");
		}
		if (memo.length() > MEMO_MAX) {
			return Response.invalid("메모는 100자 이하로 입력해주세요.");
		}
		if (!kakaoPlaceId.isEmpty() && !ParamUtil.isKakaoPlaceId(kakaoPlaceId)) {
			return Response.invalid("장소 ID 값이 올바르지 않습니다.");
		}

		Response result = null;

		try {
			Map<String, Object> data = personalPlaceService.insert(ParamUtil.map(
					"name", name,
					"category", category,
					"address", address.isEmpty() ? null : address,
					"roadAddress", roadAddress.isEmpty() ? null : roadAddress,
					"lat", lat,
					"lng", lng,
					"memo", memo.isEmpty() ? null : memo,
					"visibility", visibility,
					"kakaoPlaceId", kakaoPlaceId.isEmpty() ? null : kakaoPlaceId,
					"source", "manual".equals(ParamUtil.str(param, "source")) ? "manual" : "search"), SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (DuplicateKeyException dke) {
			// 같은 카카오 장소가 동시에 두 번 들어오면 DB UNIQUE 가 막는다
			result = Response.of(Constants.DUPLICATE_PLACE, "이미 내 지도에 있는 장소예요.", null);
		} catch (NullPointerException npe) {
			logger.error("개인 장소 등록 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("개인 장소 등록 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("개인 장소 등록 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 개인 장소 수정 (name, category, memo). 주소·좌표는 바꾸지 않는다
	@ResponseBody
	@PatchMapping("personal/places/{personalPlaceId}")
	public Response update(@PathVariable("personalPlaceId") Long personalPlaceId, @RequestBody HashMap<String, Object> param, HttpSession session) {
		String name = ParamUtil.str(param, "name");
		String category = ParamUtil.str(param, "category");
		if (name.isEmpty() || name.length() > NAME_MAX) {
			return Response.invalid("장소 이름은 100자 이하로 입력해주세요.");
		}
		if (!isValidCategory(category)) {
			return Response.invalid("카테고리 값이 올바르지 않습니다.");
		}
		String memo = param.get("memo") == null ? null : ParamUtil.str(param, "memo");
		if (memo != null && memo.length() > MEMO_MAX) {
			return Response.invalid("메모는 100자 이하로 입력해주세요.");
		}

		Response result = null;

		try {
			String code = personalPlaceService.selectEditCode(personalPlaceId, SessionUtil.getUserId(session));
			if (Constants.SUCCESS.equals(code)) {
				result = Response.of(Constants.SUCCESS, personalPlaceService.update(personalPlaceId, ParamUtil.map(
						"name", name, "category", category, "memo", (memo == null || memo.isEmpty()) ? null : memo)));
			} else {
				result = Response.of(code, EDIT_FAIL_MESSAGE, null);
			}
		} catch (NullPointerException npe) {
			logger.error("개인 장소 수정 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("개인 장소 수정 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("개인 장소 수정 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 공개 범위 변경 (private / friends / team / all)
	@ResponseBody
	@PatchMapping("personal/places/{personalPlaceId}/visibility")
	public Response updateVisibility(@PathVariable("personalPlaceId") Long personalPlaceId, @RequestBody HashMap<String, Object> param, HttpSession session) {
		String visibility = ParamUtil.str(param, "visibility");
		if (visibility.isEmpty()) {
			// 예전 클라이언트 호환: isPublic boolean
			Object legacy = param.get("isPublic");
			if (!(legacy instanceof Boolean)) {
				return Response.invalid("공개 범위 값이 올바르지 않습니다.");
			}
			visibility = (Boolean) legacy ? "all" : "private";
		}
		if (!isValidVisibility(visibility)) {
			return Response.invalid("공개 범위 값이 올바르지 않습니다.");
		}

		Response result = null;

		try {
			String code = personalPlaceService.selectEditCode(personalPlaceId, SessionUtil.getUserId(session));
			if (Constants.SUCCESS.equals(code)) {
				result = Response.of(Constants.SUCCESS, personalPlaceService.updateVisibility(personalPlaceId, visibility));
			} else {
				result = Response.of(code, EDIT_FAIL_MESSAGE, null);
			}
		} catch (NullPointerException npe) {
			logger.error("개인 장소 공개 여부 변경 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "공개 여부 변경 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("개인 장소 공개 여부 변경 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "공개 여부 변경 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("개인 장소 공개 여부 변경 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "공개 여부 변경 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 개인 장소 삭제
	@ResponseBody
	@DeleteMapping("personal/places/{personalPlaceId}")
	public Response delete(@PathVariable("personalPlaceId") Long personalPlaceId, HttpSession session) {
		Response result = null;

		try {
			String code = personalPlaceService.selectEditCode(personalPlaceId, SessionUtil.getUserId(session));
			if (Constants.SUCCESS.equals(code)) {
				personalPlaceService.delete(personalPlaceId, SessionUtil.getUserId(session));
				result = Response.of(Constants.SUCCESS);
			} else {
				result = Response.of(code, EDIT_FAIL_MESSAGE, null);
			}
		} catch (NullPointerException npe) {
			logger.error("개인 장소 삭제 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("개인 장소 삭제 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("개인 장소 삭제 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 순수 함수라 테스트에서 직접 호출한다
	static boolean isValidCategory(String category) {
		return category.isEmpty() || CATEGORIES.contains(category.toLowerCase(Locale.ROOT));
	}

	static boolean isValidVisibility(String visibility) {
		return visibility != null && VISIBILITIES.contains(visibility.toLowerCase(Locale.ROOT));
	}
}
