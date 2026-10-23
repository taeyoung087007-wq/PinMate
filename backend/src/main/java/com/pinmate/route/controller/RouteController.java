package com.pinmate.route.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import com.pinmate.route.service.RouteService;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestClientException;

import java.util.Map;

// 길찾기. 로그인 필요(/api/** 인터셉터). 예: GET /api/route?mode=walk&originLat=..&originLng=..&destLat=..&destLng=..
// mode: car(기본), walk
@RequestMapping(value = "/api/")
@Controller
public class RouteController {

	private static final Logger logger = LoggerFactory.getLogger(RouteController.class);

	@Resource(name = "RouteService")
	private RouteService routeService;

	@ResponseBody
	@GetMapping("route")
	public Response route(
			@RequestParam("originLat") double originLat,
			@RequestParam("originLng") double originLng,
			@RequestParam("destLat") double destLat,
			@RequestParam("destLng") double destLng,
			@RequestParam(value = "mode", defaultValue = "car") String mode) {
		if (!isCoord(originLat, originLng) || !isCoord(destLat, destLng)) {
			return Response.invalid("좌표가 올바르지 않습니다.");
		}
		boolean walk = "walk".equals(mode);
		if (!walk && !"car".equals(mode)) {
			return Response.invalid("지원하지 않는 이동 수단입니다.");
		}

		Response result = null;

		try {
			Map<String, Object> data = walk
					? routeService.selectWalkRoute(originLat, originLng, destLat, destLng)
					: routeService.selectCarRoute(originLat, originLng, destLat, destLng);
			result = (data == null)
					? Response.of(Constants.NOT_FOUND, "경로를 찾지 못했습니다. 출발지와 도착지가 너무 가깝거나 갈 수 있는 길이 없습니다.", null)
					: Response.of(Constants.SUCCESS, data);
		} catch (IllegalStateException ise) {
			logger.error("길찾기 키가 설정되지 않았습니다.", ise);
			result = Response.of(Constants.FAIL, "길찾기를 사용할 수 없습니다. 서버에 " + (walk ? "TMAP" : "카카오 REST") + " 키가 없습니다.", null);
		} catch (RestClientException rce) {
			logger.error("길찾기 API 호출 중 오류가 발생했습니다.", rce);
			result = Response.of(Constants.FAIL, "길찾기 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", null);
		} catch (Exception e) {
			logger.error("길찾기 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "길찾기 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	private static boolean isCoord(double lat, double lng) {
		return Double.isFinite(lat) && Double.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
	}
}
