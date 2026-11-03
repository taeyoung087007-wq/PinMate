package com.pinmate.friend.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.friend.service.FriendService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 친구. 로그인 필요(/api/** 인터셉터). 요청자 본인의 관계만 다룬다.
@RequestMapping(value = "/api/")
@Controller
public class FriendController {

	private static final Logger logger = LoggerFactory.getLogger(FriendController.class);

	private static final int QUERY_MAX = 30;

	@Resource(name = "FriendService")
	private FriendService friendService;

	// 친구 목록 + 받은 요청 + 보낸 요청 + 받은 요청 수
	@ResponseBody
	@GetMapping("friends")
	public Response overview(HttpSession session) {
		Response result = null;

		try {
			Map<String, Object> data = friendService.selectOverview(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("친구 목록 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "친구 목록 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("친구 목록 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "친구 목록 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("친구 목록 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "친구 목록 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 아이디·닉네임으로 사용자 검색 (친구 맺기용)
	@ResponseBody
	@GetMapping("friends/search")
	public Response search(@RequestParam(value = "q", required = false) String q, HttpSession session) {
		String query = q == null ? "" : q.trim();
		if (query.length() > QUERY_MAX) {
			return Response.invalid("검색어는 30자 이하로 입력해주세요.");
		}

		Response result = null;

		try {
			List<Map<String, Object>> data = friendService.search(SessionUtil.getUserId(session), query);
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("친구 검색 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "친구 검색 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("친구 검색 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "친구 검색 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("친구 검색 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "친구 검색 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 친구 요청 (userId). 상대가 먼저 보낸 요청이면 바로 수락된다
	@ResponseBody
	@PostMapping("friends/requests")
	public Response sendRequest(@RequestBody HashMap<String, Object> param, HttpSession session) {
		Long targetId = ParamUtil.lng(param, "userId");
		if (targetId == null) {
			return Response.invalid("친구로 추가할 사용자를 선택해주세요.");
		}

		Response result = null;

		try {
			Map<String, Object> data = friendService.sendRequest(SessionUtil.getUserId(session), targetId);
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "사용자를 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (IllegalArgumentException iae) {
			logger.warn("친구 요청이 거절되었습니다: {}", iae.getMessage());
			result = Response.invalid(iae.getMessage());
		} catch (NullPointerException npe) {
			logger.error("친구 요청 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "친구 요청 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("친구 요청 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "친구 요청 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 받은 친구 요청 수락
	@ResponseBody
	@PostMapping("friends/requests/{requesterId}/accept")
	public Response accept(@PathVariable("requesterId") Long requesterId, HttpSession session) {
		Response result = null;

		try {
			boolean accepted = friendService.accept(SessionUtil.getUserId(session), requesterId);
			result = accepted
					? Response.of(Constants.SUCCESS)
					: Response.of(Constants.NOT_FOUND, "받은 친구 요청이 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("친구 요청 수락 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "친구 요청 수락 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("친구 요청 수락 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "친구 요청 수락 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("친구 요청 수락 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "친구 요청 수락 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 거절·요청 취소·끊기 (방향 무관)
	@ResponseBody
	@DeleteMapping("friends/{userId}")
	public Response remove(@PathVariable("userId") Long otherId, HttpSession session) {
		Response result = null;

		try {
			boolean removed = friendService.remove(SessionUtil.getUserId(session), otherId);
			result = removed
					? Response.of(Constants.SUCCESS)
					: Response.of(Constants.NOT_FOUND, "친구 관계가 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("친구 관계 삭제 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "친구 관계 삭제 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("친구 관계 삭제 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "친구 관계 삭제 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("친구 관계 삭제 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "친구 관계 삭제 중 오류가 발생했습니다.", null);
		}

		return result;
	}
}
