import { request, post } from '../../lib/apiClient'

export const fetchTeams = (userId) => request(`/teams?userId=${encodeURIComponent(userId)}`)

export const createTeamApi = (name, userId) => post('/teams', { name, userId })

export const fetchTeam = (teamId) => request(`/teams/${encodeURIComponent(teamId)}`)

export const joinTeamApi = (code, userId) => post('/teams/join', { code, userId })

/** 초대 링크 전체(…/login?invite=코드)나 코드만 입력해도 코드를 꺼낸다 */
export function parseInviteCode(input) {
  const value = input.trim()
  try {
    return new URL(value).searchParams.get('invite') || value
  } catch {
    return value // URL 형식이 아니면 코드 자체로 본다
  }
}
