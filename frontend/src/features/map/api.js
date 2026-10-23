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
