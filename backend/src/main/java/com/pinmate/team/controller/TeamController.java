package com.pinmate.team.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.LoginAttemptLimiter;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.RequestUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.team.service.TeamService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 모임(팀). 로그인 필요(/api/** 인터셉터). 사용자는 요청 값이 아니라 세션에서 가져온다.
@RequestMapping(value = "/api/")
@Controller
public class TeamController {

	private static final Logger logger = LoggerFactory.getLogger(TeamController.class);

	private static final int TEAM_NAME_MAX = 50;   // teams.name VARCHAR(50)
	private static final int INVITE_CODE_MAX = 32; // team_invites.code VARCHAR(32)

	@Resource(name = "TeamService")
	private TeamService teamService;

	@Autowired
	private LoginAttemptLimiter loginAttemptLimiter;

	// 내가 속한 모임 목록
	@ResponseBody
	@GetMapping("teams")
	public Response teamList(HttpSession session) {
		Response result = null;

		try {
			List<Map<String, Object>> data = teamService.selectTeamList(SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("모임 목록 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 목록 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 목록 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 목록 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 목록 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 목록 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 참여 중인 모임 단건
	@ResponseBody
	@GetMapping("teams/{teamId}")
	public Response team(@PathVariable("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			Map<String, Object> data = teamService.selectTeam(teamId, SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "모임을 찾을 수 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("모임 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 모임 생성 (name)
	@ResponseBody
	@PostMapping("teams")
	public Response insertTeam(@RequestBody HashMap<String, Object> param, HttpSession session) {
		String name = ParamUtil.str(param, "name");
		if (name.isEmpty() || name.length() > TEAM_NAME_MAX) {
			return Response.invalid("모임 이름은 50자 이하로 입력해주세요.");
		}

		Response result = null;

		try {
			Map<String, Object> data = teamService.insertTeam(name, SessionUtil.getUserId(session));
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("모임 생성 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 생성 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 생성 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 생성 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 생성 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 생성 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 로그인한 회원의 초대 코드 참여 (code). 가입과 같은 시도 제한을 건다
	@ResponseBody
	@PostMapping("teams/join")
	public Response joinTeam(@RequestBody HashMap<String, Object> param, HttpServletRequest request) {
		String code = ParamUtil.str(param, "code");
		if (code.isEmpty() || code.length() > INVITE_CODE_MAX) {
			return Response.of(Constants.INVITE_FAIL, "유효하지 않거나 만료된 초대 코드입니다.", null);
		}

		String attemptKey = LoginAttemptLimiter.inviteKey(RequestUtil.clientIp(request));
		if (!loginAttemptLimiter.tryAcquire(attemptKey)) {
			return Response.of(Constants.INVITE_BLOCKED, "초대 코드를 여러 번 잘못 입력했습니다. 5분 뒤에 다시 시도해주세요.", null);
		}

		Response result = null;

		try {
			Map<String, Object> data = teamService.joinTeam(code, SessionUtil.getUserId(request.getSession(false)));
			if (data == null) {
				result = Response.of(Constants.INVITE_FAIL, "유효하지 않거나 만료된 초대 코드입니다.", null);
			} else {
				loginAttemptLimiter.reset(attemptKey);
				result = Response.of(Constants.SUCCESS, data);
			}
		} catch (NullPointerException npe) {
			logger.error("모임 참여 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 참여 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 참여 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 참여 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 참여 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 참여 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 모임 삭제. 모임장만 가능. 장소·추천·초대 코드도 함께 지워진다
	@ResponseBody
	@DeleteMapping("teams/{teamId}")
	public Response deleteTeam(@PathVariable("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			String code = teamService.deleteTeam(teamId, SessionUtil.getUserId(session));
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS)
					: Response.of(code, Constants.NO_PERMISSION.equals(code) ? "모임장만 모임을 삭제할 수 있습니다." : "모임을 찾을 수 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("모임 삭제 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 삭제 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 삭제 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 삭제 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 삭제 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 삭제 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 모임 나가기. 모임장이 나가면 가장 먼저 들어온 멤버가 모임장이 되고, 마지막 한 명이 나가면 모임이 삭제된다
	@ResponseBody
	@PostMapping("teams/{teamId}/leave")
	public Response leaveTeam(@PathVariable("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			String code = teamService.leaveTeam(teamId, SessionUtil.getUserId(session));
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS)
					: Response.of(code, "모임을 찾을 수 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("모임 나가기 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임 나가기 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임 나가기 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임 나가기 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임 나가기 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임 나가기 중 오류가 발생했습니다.", null);
		}

		return result;
	}
}
