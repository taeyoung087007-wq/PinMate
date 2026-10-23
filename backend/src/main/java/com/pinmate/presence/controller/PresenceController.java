package com.pinmate.presence.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.presence.service.PresenceService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@RequestMapping(value = "/api/")
@Controller
public class PresenceController {

	private static final Logger logger = LoggerFactory.getLogger(PresenceController.class);

	@Resource(name = "PresenceService")
	private PresenceService presenceService;

	// 접속 상태 갱신. 사용자는 세션에서 가져온다 (본문의 userId 는 쓰지 않는다)
	@ResponseBody
	@PostMapping("presence/heartbeat")
	public Response heartbeat(HttpSession session) {
		Response result = null;

		try {
			presenceService.touch(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS);
		} catch (NullPointerException npe) {
			logger.error("접속 상태 갱신 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "접속 상태 갱신 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("접속 상태 갱신 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "접속 상태 갱신 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("접속 상태 갱신 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "접속 상태 갱신 중 오류가 발생했습니다.", null);
		}

		return result;
	}
}
