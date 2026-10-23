package com.pinmate.cmmn.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@RequestMapping(value = "/api/")
@Controller
public class CmmnController {

	//헬스체크 (로그인 불필요)
	@ResponseBody
	@GetMapping("health")
	public Response health() {
		return Response.of(Constants.SUCCESS, Map.of("status", "UP"));
	}
}
