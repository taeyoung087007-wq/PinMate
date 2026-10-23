package com.pinmate.place.controller;

import com.pinmate.cmmn.util.Constants;
import com.pinmate.cmmn.util.Response;
import com.pinmate.place.service.PlaceService;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.Map;

// 장소(상호명) 검색. 로그인 필요(/api/** 인터셉터). NAVER 지역 검색을 서버가 대신 호출한다.
@RequestMapping(value = "/api/")
@Controller
public class PlaceController {

	private static final Logger logger = LoggerFactory.getLogger(PlaceController.class);

	@Resource(name = "PlaceService")
	private PlaceService placeService;

	// 상호명·주소로 검색. 예: /api/places/search?query=대림창고
	@ResponseBody
	@GetMapping("places/search")
	public Response search(@RequestParam(name = "query", defaultValue = "") String query) {
		if (query.isBlank()) {
			return Response.of(Constants.SUCCESS, List.of());
		}

		Response result = null;

		try {
			List<Map<String, Object>> data = placeService.search(query.trim());
			result = Response.of(Constants.SUCCESS, data);
		} catch (IllegalStateException ise) {
			// 키 미설정·업스트림 실패. 문구를 그대로 보여준다 (프론트는 주소 검색만 쓴다)
			logger.warn("장소 검색 실패: {}", ise.getMessage());
			result = Response.of(Constants.FAIL, ise.getMessage(), null);
		} catch (NullPointerException npe) {
			logger.error("장소 검색 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "장소 검색 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("장소 검색 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "장소 검색 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("장소 검색 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "장소 검색 중 오류가 발생했습니다.", null);
		}

		return result;
	}

	/*
	 * 지도에서 누른 좌표 주변의 상가 1곳.
	 * 프론트는 역지오코딩으로 얻은 주소 조각만 넘기고, 검색은 서버가 대신 한다.
	 * 찾지 못하면 data 가 null 로 내려가고, 프론트는 주소만 표시한다.
	 */
	@ResponseBody
	@GetMapping("places/nearby")
	public Response nearby(@RequestParam("lat") double lat,
	                       @RequestParam("lng") double lng,
	                       @RequestParam(name = "tapMeters", defaultValue = "30") int tapMeters,
	                       @RequestParam(name = "area", required = false) String area,
	                       @RequestParam(name = "building", required = false) String building,
	                       @RequestParam(name = "road", required = false) String road,
	                       @RequestParam(name = "roadNumber", required = false) String roadNumber) {
		Response result = null;

		try {
			Map<String, Object> data = placeService.selectNearby(lat, lng, tapMeters, area, building, road, roadNumber);
			result = Response.of(Constants.SUCCESS, data);
		} catch (NullPointerException npe) {
			logger.error("주변 상가 조회 중 NullPointerException이 발생했습니다.", npe);
			result = Response.of(Constants.FAIL, "주변 상가 조회 중 오류가 발생했습니다.", null);
		} catch (IllegalArgumentException iae) {
			logger.error("주변 상가 조회 중 IllegalArgumentException이 발생했습니다.", iae);
			result = Response.of(Constants.FAIL, "주변 상가 조회 중 오류가 발생했습니다.", null);
		} catch (Exception e) {
			logger.error("주변 상가 조회 중 알 수 없는 오류가 발생했습니다.", e);
			result = Response.of(Constants.FAIL, "주변 상가 조회 중 오류가 발생했습니다.", null);
		}

		return result;
	}
}
