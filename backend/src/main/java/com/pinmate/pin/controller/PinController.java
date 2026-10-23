package com.pinmate.pin.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.pin.service.PinService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 장소(핀). 로그인 필요(/api/** 인터셉터). 등록자·추천인은 요청 값이 아니라 세션에서 가져온다.
// 요청자가 속하지 않은 팀의 핀은 없는 것과 같이 NOT_FOUND(91)로 응답한다.
@RequestMapping(value = "/api/")
@Controller
public class PinController {

	private static final Logger logger = LoggerFactory.getLogger(PinController.class);

	// 길이 제한은 places, recommendations.comment 컬럼과 맞춘다
	private static final int NAME_MAX = 100;
	private static final int CATEGORY_MAX = 20;
	private static final int ADDRESS_MAX = 200;
	private static final int MEMO_MAX = 100;

	@Resource(name = "PinService")
	private PinService pinService;

	// 팀의 핀 목록
	@ResponseBody
	@GetMapping("pins")
	public Response pinList(@RequestParam("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			List<Map<String, Object>> data = pinService.selectPinList(teamId, SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "모임을 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("장소 목록 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 목록 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("장소 목록 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 목록 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("장소 목록 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 목록 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 핀 등록 (teamId, name, category, address, roadAddress, lat, lng, memo)
	@ResponseBody
	@PostMapping("pins")
	public Response insertPin(@RequestBody HashMap<String, Object> param, HttpSession session) {
		Long teamId = ParamUtil.lng(param, "teamId");
		String name = ParamUtil.str(param, "name");
		String category = ParamUtil.str(param, "category");
		String address = ParamUtil.str(param, "address");
		String roadAddress = ParamUtil.str(param, "roadAddress");
		Double lat = ParamUtil.dbl(param, "lat");
		Double lng = ParamUtil.dbl(param, "lng");
		String memo = ParamUtil.str(param, "memo");

		if (teamId == null) {
			return Response.invalid("팀 ID가 필요합니다.");
		}
		if (name.isEmpty() || name.length() > NAME_MAX) {
			return Response.invalid("장소 이름은 100자 이하로 입력해주세요.");
		}
		if (category.length() > CATEGORY_MAX) {
			return Response.invalid("카테고리 값이 올바르지 않습니다.");
		}
		if (address.length() > ADDRESS_MAX || roadAddress.length() > ADDRESS_MAX) {
			return Response.invalid("주소는 200자 이하로 입력해주세요.");
		}
		if (lat == null || lat < -90 || lat > 90 || lng == null || lng < -180 || lng > 180) {
			return Response.invalid("좌표 값이 올바르지 않습니다.");
		}
		if (memo.length() > MEMO_MAX) {
			return Response.invalid("한 줄 추천평은 100자 이하로 입력해주세요.");
		}

		Response result = null;

		try {
			Map<String, Object> data = pinService.insertPin(ParamUtil.map(
					"teamId", teamId,
					"name", name,
					"category", category,
					"address", address.isEmpty() ? null : address,
					"roadAddress", roadAddress.isEmpty() ? null : roadAddress,
					"lat", lat,
					"lng", lng,
					"memo", memo.isEmpty() ? null : memo), SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "모임을 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("장소 등록 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("장소 등록 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("장소 등록 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 등록 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 추천 토글
	@ResponseBody
	@PostMapping("pins/{pinId}/recommend")
	public Response toggleRecommendation(@PathVariable("pinId") Long pinId, HttpSession session) {
		Response result = null;

		try {
			Map<String, Object> data = pinService.toggleRecommendation(pinId, SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "장소를 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("추천 처리 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "추천 처리 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("추천 처리 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "추천 처리 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("추천 처리 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "추천 처리 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 방문 토글
	@ResponseBody
	@PostMapping("pins/{pinId}/visit")
	public Response toggleVisit(@PathVariable("pinId") Long pinId, HttpSession session) {
		Response result = null;

		try {
			Map<String, Object> data = pinService.toggleVisit(pinId, SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "장소를 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("방문 처리 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "방문 처리 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("방문 처리 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "방문 처리 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("방문 처리 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "방문 처리 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 핀 수정 (name, category, memo). 주소·좌표는 바꾸지 않는다. 등록자 또는 팀 owner 만 가능
	@ResponseBody
	@PatchMapping("pins/{pinId}")
	public Response updatePin(@PathVariable("pinId") Long pinId, @RequestBody HashMap<String, Object> param, HttpSession session) {
		String name = ParamUtil.str(param, "name");
		String category = ParamUtil.str(param, "category");
		if (name.isEmpty() || name.length() > NAME_MAX) {
			return Response.invalid("장소 이름은 100자 이하로 입력해주세요.");
		}
		if (category.length() > CATEGORY_MAX) {
			return Response.invalid("카테고리 값이 올바르지 않습니다.");
		}
		Map<String, Object> pin = ParamUtil.map("name", name, "category", category);
		if (param.get("memo") != null) {
			String memo = ParamUtil.str(param, "memo");
			if (memo.length() > MEMO_MAX) {
				return Response.invalid("한 줄 추천평은 100자 이하로 입력해주세요.");
			}
			pin.put("memo", memo.isEmpty() ? null : memo);
		}

		Response result = null;

		try {
			String code = pinService.selectEditCode(pinId, SessionUtil.getUserId(session));
			if (Constants.SUCCESS.equals(code)) {
				result = Response.of(Constants.SUCCESS, pinService.updatePin(pinId, pin));
			} else {
				result = Response.of(code, editFailMessage(code), null);
			}
		} catch (NullPointerException npe) {
			logger.error("장소 수정 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("장소 수정 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("장소 수정 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 수정 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 핀 삭제. 추천·방문 기록도 함께 지워진다. 등록자 또는 팀 owner 만 가능
	@ResponseBody
	@DeleteMapping("pins/{pinId}")
	public Response deletePin(@PathVariable("pinId") Long pinId, HttpSession session) {
		Response result = null;

		try {
			String code = pinService.selectEditCode(pinId, SessionUtil.getUserId(session));
			if (Constants.SUCCESS.equals(code)) {
				pinService.deletePin(pinId);
				result = Response.of(Constants.SUCCESS);
			} else {
				result = Response.of(code, editFailMessage(code), null);
			}
		} catch (NullPointerException npe) {
			logger.error("장소 삭제 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("장소 삭제 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("장소 삭제 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 삭제 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	private String editFailMessage(String code) {
		return Constants.NO_PERMISSION.equals(code) ? "이 장소를 수정할 권한이 없습니다." : "장소를 찾을 수 없습니다.";
	}
}
