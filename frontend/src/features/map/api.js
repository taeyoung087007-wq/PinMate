import { request, post } from '../../lib/apiClient'

// 지도 화면 상단에 쓰는 팀 정보. feature 간 import를 피하려고 teams/api.js가 아닌 여기에 둔다
export const fetchTeam = (teamId) => request(`/teams/${encodeURIComponent(teamId)}`)

export const fetchPins = (teamId) => request(`/pins?teamId=${encodeURIComponent(teamId)}`)

export const createPinApi = (pinData) => post('/pins', pinData)

/** @returns {Promise<{ pin, reachedAllApproved: boolean }>} 추천이 0명이 돼도 장소는 남는다 */
export const toggleRecommendationApi = (pinId, userId) =>
  post(`/pins/${encodeURIComponent(pinId)}/recommend`, { userId })

/** 이름·카테고리·한 줄 추천평 수정 (등록자 또는 팀 owner 만) */
export const updatePinApi = (pinId, data) =>
  request(`/pins/${encodeURIComponent(pinId)}`, { method: 'PATCH', body: JSON.stringify(data) })

/** 핀 삭제 (등록자 또는 팀 owner 만) */
export const deletePinApi = (pinId) =>
  request(`/pins/${encodeURIComponent(pinId)}`, { method: 'DELETE' })

/**
 * 길찾기 (백엔드가 자동차는 카카오모빌리티, 도보는 TMAP 을 대신 호출)
 * @param {'car' | 'walk'} mode
 * @returns {Promise<{ distance: number, duration: number, path: Array<[number, number]> }>} 거리(m), 시간(초), [위도, 경도] 목록
 */
export const fetchRoute = (origin, dest, mode = 'car') => {
  const params = new URLSearchParams({
    mode, originLat: origin.lat, originLng: origin.lng, destLat: dest.lat, destLng: dest.lng,
  })
  return request(`/route?${params}`)
}

/**
 * 정류장 실시간 도착 예정 (백엔드가 TAGO 를 대신 호출). stationId·routeIds 는 ODsay 결과 그대로
 * @returns {Promise<{ cityCode: string | null, arrivals: Array<{ routeId, routeNo, minutes, stopsAway }> }>}
 */
export const fetchArrivals = ({ lat, lng, stationId, routeIds }) => {
  const params = new URLSearchParams({ lat, lng, nodeId: stationId, routeIds: routeIds.join(',') })
  return request(`/transit/arrivals?${params}`)
}

/** 노선의 운행 중 버스 위치 [{ lat, lng, vehicleNo, nodeName }] */
export const fetchBusLocations = (cityCode, routeId) =>
  request(`/transit/bus-locations?${new URLSearchParams({ cityCode, routeId })}`)

/** 수도권 지하철 역 실시간 도착 [{ subwayId, direction, destination, seconds, message, express }] */
export const fetchSubwayArrivals = (station) =>
  request(`/transit/subway-arrivals?${new URLSearchParams({ station })}`)

/** 그해 공휴일 ["2026-01-01", …] (대체공휴일·선거일 포함). 지하철 휴일 시간표에 쓴다 */
export const fetchHolidays = (year) => request(`/holidays?year=${encodeURIComponent(year)}`)

