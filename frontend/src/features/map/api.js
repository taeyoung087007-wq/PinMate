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

/**
 * 상호명으로 장소를 검색한다 (백엔드가 NAVER 검색 API를 대신 호출).
 * 좌표는 포함되지 않으므로, 선택한 뒤 주소를 지오코딩해 얻는다.
 * @returns {Promise<Array<{name: string, category: string, address: string}>>}
 */
export const searchPlaces = (query) => request(`/places/search?query=${encodeURIComponent(query)}`)
