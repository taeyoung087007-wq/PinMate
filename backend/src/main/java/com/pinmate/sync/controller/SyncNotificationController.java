package com.pinmate.sync.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.sync.service.SyncNotificationService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;

// 동기화 알림 (F-71, F-72). 로그인 필요(/api/** 인터셉터). 사용자는 세션에서 가져온다
@RequestMapping(value = "/api/")
@Controller
public class SyncNotificationController {

	private static final Logger logger = LoggerFactory.getLogger(SyncNotificationController.class);

	@Resource(name = "SyncNotificationService")
	private SyncNotificationService syncNotificationService;

	// 내 알림 목록 + 처리 안 한 개수
	@ResponseBody
	@GetMapping("sync-notifications")
	public Response notifications(HttpSession session) {
		Response result = null;

		try {
			Map<String, Object> data = syncNotificationService.selectOverview(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("알림 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "알림을 불러오지 못했습니다.", null);
		} catch (Exception e) {
			logger.error("알림 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림을 불러오지 못했습니다.", null);
		}

		return result;
	}

	// 배지용 개수
	@ResponseBody
	@GetMapping("sync-notifications/count")
	public Response pendingCount(HttpSession session) {
		Response result = null;

		try {
			int pending = syncNotificationService.countPending(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, ParamUtil.map("pending", pending));
		} catch (Exception e) {
			logger.error("알림 개수 조회 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림 개수를 불러오지 못했습니다.", null);
		}

		return result;
	}

	// 알림 반영 (추가 → 내 지도에 담기, 삭제 → 내 지도에서 지우기)
	@ResponseBody
	@PostMapping("sync-notifications/{notificationId}/apply")
	public Response apply(@PathVariable("notificationId") Long notificationId, HttpSession session) {
		Response result = null;

		try {
			String code = syncNotificationService.apply(notificationId, SessionUtil.getUserId(session));
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS, null)
					: Response.of(Constants.NOT_FOUND, "알림을 찾을 수 없습니다.", null);
		} catch (Exception e) {
			logger.error("알림 반영 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림을 반영하지 못했습니다.", null);
		}

		return result;
	}

	// 알림 무시
	@ResponseBody
	@PostMapping("sync-notifications/{notificationId}/ignore")
	public Response ignore(@PathVariable("notificationId") Long notificationId, HttpSession session) {
		Response result = null;

		try {
			String code = syncNotificationService.ignore(notificationId, SessionUtil.getUserId(session));
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS, null)
					: Response.of(Constants.NOT_FOUND, "알림을 찾을 수 없습니다.", null);
		} catch (Exception e) {
			logger.error("알림 무시 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림을 무시하지 못했습니다.", null);
		}

		return result;
	}

	// 팀의 알림 모두 반영
	@ResponseBody
	@PostMapping("sync-notifications/apply-all")
	public Response applyAll(@RequestBody HashMap<String, Object> param, HttpSession session) {
		Response result = null;

		try {
			Long teamId = ParamUtil.lng(param, "teamId");
			if (teamId == null) {
				return Response.of(Constants.INVALID, "모임을 지정해주세요.", null);
			}
			syncNotificationService.applyAll(teamId, SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, null);
		} catch (Exception e) {
			logger.error("알림 모두 반영 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림을 반영하지 못했습니다.", null);
		}

		return result;
	}

	// 팀의 알림 모두 무시
	@ResponseBody
	@PostMapping("sync-notifications/ignore-all")
	public Response ignoreAll(@RequestBody HashMap<String, Object> param, HttpSession session) {
		Response result = null;

		try {
			Long teamId = ParamUtil.lng(param, "teamId");
			if (teamId == null) {
				return Response.of(Constants.INVALID, "모임을 지정해주세요.", null);
			}
			syncNotificationService.ignoreAll(teamId, SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, null);
		} catch (Exception e) {
			logger.error("알림 모두 무시 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "알림을 무시하지 못했습니다.", null);
		}

		return result;
	}
}
