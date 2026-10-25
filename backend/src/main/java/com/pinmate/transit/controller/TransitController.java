package com.pinmate.transit.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import com.pinmate.transit.service.TransitService;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestClientException;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

// 실시간 버스. 로그인 필요(/api/** 인터셉터)
// 예: GET /api/transit/arrivals?lat=..&lng=..&nodeId=CJB270000636&routeIds=CJB270026500,CJB270011200
//     GET /api/transit/bus-locations?cityCode=33010&routeId=CJB270026500
@RequestMapping(value = "/api/")
@Controller
public class TransitController {

	private static final Logger logger = LoggerFactory.getLogger(TransitController.class);

	// TAGO ID 형식 (예: CJB270000636, 33010). 그대로 외부 API 쿼리에 들어가므로 형식을 제한한다
	private static final Pattern ID = Pattern.compile("[A-Za-z0-9]{1,30}");
	private static final int MAX_ROUTES = 10;
	// 역 이름: 한글·영문·숫자·괄호·점·가운뎃점만 (예: "총신대입구(이수)", "디지털미디어시티")
	private static final Pattern STATION_NAME = Pattern.compile("[가-힣A-Za-z0-9().·]+");

	@Resource(name = "TransitService")
	private TransitService transitService;

	@ResponseBody
	@GetMapping("transit/arrivals")
	public Response arrivals(
			@RequestParam("lat") double lat,
			@RequestParam("lng") double lng,
			@RequestParam("nodeId") String nodeId,
			@RequestParam(value = "routeIds", defaultValue = "") String routeIds) {
		List<String> routes = Arrays.stream(routeIds.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
		if (!isCoord(lat, lng) || !ID.matcher(nodeId).matches() || routes.size() > MAX_ROUTES
				|| routes.stream().anyMatch(r -> !ID.matcher(r).matches())) {
			return Response.invalid("정류장 정보가 올바르지 않습니다.");
		}

		try {
			return Response.of(Constants.SUCCESS, transitService.selectArrivals(lat, lng, nodeId, routes));
		} catch (IllegalStateException ise) {
			logger.error("실시간 도착 정보 조회 실패 (키 또는 TAGO 응답 오류)", ise);
			return Response.of(Constants.FAIL, "실시간 도착 정보를 불러오지 못했습니다.", null);
		} catch (RestClientException rce) {
			logger.error("실시간 도착 정보 API 호출 중 오류가 발생했습니다.", rce);
			return Response.of(Constants.FAIL, "실시간 도착 정보를 불러오지 못했습니다.", null);
		} catch (Exception e) {
			logger.error("실시간 도착 정보 조회 중 알 수 없는 오류가 발생했습니다.", e);
			return Response.of(Constants.FAIL, "실시간 도착 정보를 불러오지 못했습니다.", null);
		}
	}

	@ResponseBody
	@GetMapping("transit/bus-locations")
	public Response busLocations(
			@RequestParam("cityCode") String cityCode,
			@RequestParam("routeId") String routeId) {
		if (!ID.matcher(cityCode).matches() || !ID.matcher(routeId).matches()) {
			return Response.invalid("노선 정보가 올바르지 않습니다.");
		}

		try {
			return Response.of(Constants.SUCCESS, transitService.selectBusLocations(cityCode, routeId));
		} catch (IllegalStateException ise) {
			logger.error("버스 위치 조회 실패 (키 또는 TAGO 응답 오류)", ise);
			return Response.of(Constants.FAIL, "버스 위치를 불러오지 못했습니다.", null);
		} catch (RestClientException rce) {
			logger.error("버스 위치 API 호출 중 오류가 발생했습니다.", rce);
			return Response.of(Constants.FAIL, "버스 위치를 불러오지 못했습니다.", null);
		} catch (Exception e) {
			logger.error("버스 위치 조회 중 알 수 없는 오류가 발생했습니다.", e);
			return Response.of(Constants.FAIL, "버스 위치를 불러오지 못했습니다.", null);
		}
	}

	// 수도권 지하철 실시간 도착. 예: GET /api/transit/subway-arrivals?station=서울
	@ResponseBody
	@GetMapping("transit/subway-arrivals")
	public Response subwayArrivals(@RequestParam("station") String station) {
		String name = station.trim();
		if (name.isEmpty() || name.length() > 30 || !STATION_NAME.matcher(name).matches()) {
			return Response.invalid("역 이름이 올바르지 않습니다.");
		}

		try {
			return Response.of(Constants.SUCCESS, transitService.selectSubwayArrivals(name));
		} catch (IllegalStateException ise) {
			logger.error("지하철 실시간 도착 조회 실패 (키 또는 응답 오류)", ise);
			return Response.of(Constants.FAIL, "지하철 실시간 도착 정보를 불러오지 못했습니다.", null);
		} catch (RestClientException rce) {
			logger.error("지하철 실시간 도착 API 호출 중 오류가 발생했습니다.", rce);
			return Response.of(Constants.FAIL, "지하철 실시간 도착 정보를 불러오지 못했습니다.", null);
		} catch (Exception e) {
			logger.error("지하철 실시간 도착 조회 중 알 수 없는 오류가 발생했습니다.", e);
			return Response.of(Constants.FAIL, "지하철 실시간 도착 정보를 불러오지 못했습니다.", null);
		}
	}

	// 공휴일. 예: GET /api/holidays?year=2026
	@ResponseBody
	@GetMapping("holidays")
	public Response holidays(@RequestParam("year") int year) {
		if (year < 2000 || year > 2100) {
			return Response.invalid("연도가 올바르지 않습니다.");
		}

		try {
			return Response.of(Constants.SUCCESS, transitService.selectHolidays(year));
		} catch (IllegalStateException ise) {
			logger.error("공휴일 조회 실패 (키 또는 응답 오류)", ise);
			return Response.of(Constants.FAIL, "공휴일 정보를 불러오지 못했습니다.", null);
		} catch (RestClientException rce) {
			logger.error("공휴일 API 호출 중 오류가 발생했습니다.", rce);
			return Response.of(Constants.FAIL, "공휴일 정보를 불러오지 못했습니다.", null);
		} catch (Exception e) {
			logger.error("공휴일 조회 중 알 수 없는 오류가 발생했습니다.", e);
			return Response.of(Constants.FAIL, "공휴일 정보를 불러오지 못했습니다.", null);
		}
	}

	private static boolean isCoord(double lat, double lng) {
		return Double.isFinite(lat) && Double.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
	}
}
