package com.pinmate.team.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.LoginAttemptLimiter;
import com.pinmate.cmmn.util.ParamUtil;
import com.pinmate.cmmn.util.RequestUtil;
import com.pinmate.cmmn.util.Response;
import com.pinmate.cmmn.util.SessionUtil;
import com.pinmate.pin.service.PinService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
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
	private static final int CONSENSUS_MIN = 2;     // teams.consensus_min_count CHECK (>= 2)
	private static final int CONSENSUS_MAX = 100;   // 터무니없는 값만 거른다. 팀원 수보다 크면 판정은 전원 기준

	@Resource(name = "TeamService")
	private TeamService teamService;

	@Resource(name = "PinService")
	private PinService pinService;

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

	// 모임원이 공개한 개인 장소 (모임 지도 오버레이)
	@ResponseBody
	@GetMapping("teams/{teamId}/personal-places")
	public Response teamPublicPlaces(@PathVariable("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			List<Map<String, Object>> data = teamService.selectTeamPublicPlaces(teamId, SessionUtil.getUserId(session));
			result = (data == null)
					? Response.of(Constants.NO_PERMISSION, "모임원만 볼 수 있습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("모임원 장소 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "모임원 장소 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("모임원 장소 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "모임원 장소 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("모임원 장소 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "모임원 장소 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 모임 장소를 내 지도에도 자동 저장할지 (사람마다·모임마다 따로)
	@ResponseBody
	@PatchMapping("teams/{teamId}/sync-setting")
	public Response updateSyncSetting(@PathVariable("teamId") Long teamId, @RequestBody HashMap<String, Object> param,
			HttpSession session) {
		Response result = null;

		try {
			boolean syncToPersonal = Boolean.TRUE.equals(param.get("syncToPersonal"));
			boolean updated = teamService.updateSyncSetting(teamId, SessionUtil.getUserId(session), syncToPersonal);
			result = updated
					? Response.of(Constants.SUCCESS, ParamUtil.map("syncToPersonal", syncToPersonal))
					: Response.of(Constants.NO_PERMISSION, "모임원만 설정할 수 있습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("동기화 설정 변경 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "동기화 설정 변경 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("동기화 설정 변경 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "동기화 설정 변경 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("동기화 설정 변경 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "동기화 설정 변경 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 내 지도(개인 핀)를 모임 지도로 가져오기 (F-68). 같은 장소는 내 추천으로 합치고, 없으면 새 장소로 등록
	@ResponseBody
	@PostMapping("teams/{teamId}/import-personal-places")
	public Response importPersonalPlaces(@PathVariable("teamId") Long teamId,
			@RequestBody HashMap<String, Object> param, HttpSession session) {
		Response result = null;

		try {
			List<Long> ids = new ArrayList<>();
			if (param.get("ids") instanceof List<?> raw) {
				for (Object value : raw) {
					if (value instanceof Number number) ids.add(number.longValue());
				}
			}
			if (ids.isEmpty()) {
				return Response.of(Constants.INVALID, "가져올 장소를 골라주세요.", null);
			}

			Map<String, Object> data = pinService.importPersonalPlaces(teamId, SessionUtil.getUserId(session), ids);
			result = (data == null)
					? Response.of(Constants.NO_PERMISSION, "모임원만 가져올 수 있습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (Exception e) {
			logger.error("개인 장소 가져오기 중 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소를 가져오지 못했습니다.", null);
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

	// 초대 링크 다시 만들기 (F-58). 모임장·관리자만. 이전 코드는 더 이상 쓸 수 없다
	@ResponseBody
	@PostMapping("teams/{teamId}/invite")
	public Response reissueInvite(@PathVariable("teamId") Long teamId, HttpSession session) {
		Response result = null;

		try {
			Long userId = SessionUtil.getUserId(session);
			String code = teamService.reissueInvite(teamId, userId);
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS, teamService.selectTeam(teamId, userId))
					: Response.of(code, Constants.NO_PERMISSION.equals(code) ? "모임장이나 관리자만 초대 링크를 새로 만들 수 있습니다." : "모임을 찾을 수 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("초대 링크 재발급 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "초대 링크 재발급 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("초대 링크 재발급 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "초대 링크 재발급 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("초대 링크 재발급 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "초대 링크 재발급 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 모두 인정 기준 변경. 모임장·관리자만 (rule: all = 전원 / min_count = minCount 명 이상). 바꾸면 모든 장소를 다시 판정한다
	@ResponseBody
	@PatchMapping("teams/{teamId}/consensus")
	public Response updateConsensusRule(@PathVariable("teamId") Long teamId, @RequestBody HashMap<String, Object> param, HttpSession session) {
		String rule = ParamUtil.str(param, "rule");
		Long minCount = ParamUtil.lng(param, "minCount");
		if (!"all".equals(rule) && !"min_count".equals(rule)) {
			return Response.invalid("기준은 all 또는 min_count 만 고를 수 있습니다.");
		}
		if ("min_count".equals(rule) && (minCount == null || minCount < CONSENSUS_MIN || minCount > CONSENSUS_MAX)) {
			return Response.invalid("기준 인원은 2~100명으로 입력해주세요.");
		}

		Response result = null;

		try {
			Long userId = SessionUtil.getUserId(session);
			String code = teamService.updateConsensusRule(teamId, userId, rule, minCount == null ? null : minCount.intValue());
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS, teamService.selectTeam(teamId, userId))
					: Response.of(code, Constants.NO_PERMISSION.equals(code) ? "모임장이나 관리자만 인정 기준을 바꿀 수 있습니다." : "모임을 찾을 수 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("인정 기준 변경 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "인정 기준 변경 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("인정 기준 변경 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "인정 기준 변경 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("인정 기준 변경 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "인정 기준 변경 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	// 관리자 지정·해제 (F-54). 모임장만 (memberId: 멤버 login_id, role: admin / member)
	@ResponseBody
	@PatchMapping("teams/{teamId}/member-role")
	public Response updateMemberRole(@PathVariable("teamId") Long teamId, @RequestBody HashMap<String, Object> param, HttpSession session) {
		String memberId = ParamUtil.str(param, "memberId");
		String role = ParamUtil.str(param, "role");
		if (memberId.isEmpty()) {
			return Response.invalid("멤버를 골라주세요.");
		}
		if (!"admin".equals(role) && !"member".equals(role)) {
			return Response.invalid("역할은 admin 또는 member 만 고를 수 있습니다.");
		}

		Response result = null;

		try {
			Long userId = SessionUtil.getUserId(session);
			String code = teamService.updateMemberRole(teamId, userId, memberId, role);
			result = Constants.SUCCESS.equals(code)
					? Response.of(Constants.SUCCESS, teamService.selectTeam(teamId, userId))
					: Response.of(code, Constants.NO_PERMISSION.equals(code) ? "모임장만 관리자를 정할 수 있고, 모임장의 역할은 바꿀 수 없습니다." : "모임이나 멤버를 찾을 수 없습니다.", null);
		} catch (NullPointerException npe) {
			logger.error("멤버 역할 변경 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "멤버 역할 변경 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("멤버 역할 변경 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "멤버 역할 변경 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("멤버 역할 변경 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "멤버 역할 변경 중 오류가 발생했습니다.", null);
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
