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
