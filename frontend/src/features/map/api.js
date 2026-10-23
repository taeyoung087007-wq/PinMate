import { request, post } from '../../lib/apiClient'

// 지도 화면 상단에 쓰는 팀 정보. feature 간 import를 피하려고 teams/api.js가 아닌 여기에 둔다
export const fetchTeam = (teamId) => request(`/teams/${encodeURIComponent(teamId)}`)

export const fetchPins = (teamId) => request(`/pins?teamId=${encodeURIComponent(teamId)}`)

export const createPinApi = (pinData) => post('/pins', pinData)

/** @returns {Promise<{ pin, reachedAllApproved: boolean }>} */
export const toggleRecommendationApi = (pinId, userId) =>
  post(`/pins/${encodeURIComponent(pinId)}/recommend`, { userId })

export const toggleVisitApi = (pinId, userId) =>
  post(`/pins/${encodeURIComponent(pinId)}/visit`, { userId })

/** 이름·카테고리·한 줄 추천평 수정 (등록자 또는 팀 owner 만) */
export const updatePinApi = (pinId, data) =>
  request(`/pins/${encodeURIComponent(pinId)}`, { method: 'PATCH', body: JSON.stringify(data) })

/** 핀 삭제 (등록자 또는 팀 owner 만) */
export const deletePinApi = (pinId) =>
  request(`/pins/${encodeURIComponent(pinId)}`, { method: 'DELETE' })

/**
 * 상호명으로 장소를 검색한다 (백엔드가 NAVER 검색 API를 대신 호출).
 * 좌표는 포함되지 않으므로, 선택한 뒤 주소를 지오코딩해 얻는다.
 * @returns {Promise<Array<{name: string, category: string, address: string}>>}
 */
export const searchPlaces = (query) => request(`/places/search?query=${encodeURIComponent(query)}`)

/**
 * 지도에서 누른 좌표 주변의 상가를 찾는다.
 * 역지오코딩으로 얻은 주소 조각을 넘기면, 서버가 질의를 순서대로 시도해 가장 맞는 한 곳을 돌려준다.
 * (브라우저가 여러 번 검색하지 않도록 검색을 서버로 모은 것)
 * @returns {Promise<{name: string, category: string, address: string, lat: number, lng: number} | null>}
 */
export const searchNearby = ({ lat, lng, tapMeters, area, building, road, roadNumber }) => {
  const params = new URLSearchParams({ lat, lng, tapMeters: Math.round(tapMeters) })
  if (area) params.set('area', area)
  if (building) params.set('building', building)
  if (road) params.set('road', road)
  if (roadNumber) params.set('roadNumber', roadNumber)
  return request(`/places/nearby?${params}`)
}
