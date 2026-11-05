import { request, post } from '../../lib/apiClient'

export const fetchTeams = (userId) => request(`/teams?userId=${encodeURIComponent(userId)}`)

export const createTeamApi = (name, userId) => post('/teams', { name, userId })

export const fetchTeam = (teamId) => request(`/teams/${encodeURIComponent(teamId)}`)

export const joinTeamApi = (code, userId) => post('/teams/join', { code, userId })

/** 모임 삭제 (모임장만). 장소·추천도 함께 지워진다 */
export const deleteTeamApi = (teamId) => request(`/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE' })

/** 모임 나가기. 모임장이면 가장 먼저 들어온 멤버가 모임장이 되고, 마지막 한 명이면 모임이 삭제된다 */
export const leaveTeamApi = (teamId) => post(`/teams/${encodeURIComponent(teamId)}/leave`, {})

/** 초대 링크 새로 만들기 (모임장·관리자만). 이전 링크는 더 이상 쓸 수 없다. @returns {Promise<team>} */
export const reissueInviteApi = (teamId) => post(`/teams/${encodeURIComponent(teamId)}/invite`, {})

/** 모두 인정 기준 변경 (모임장·관리자만). rule 'all' = 전원, 'min_count' = minCount 명 이상. 바꾸면 모든 장소를 다시 판정한다. @returns {Promise<team>} */
export const updateConsensusRuleApi = (teamId, rule, minCount) =>
  request(`/teams/${encodeURIComponent(teamId)}/consensus`, {
    method: 'PATCH',
    body: JSON.stringify({ rule, minCount }),
  })

/** 관리자 지정·해제 (모임장만). memberId 는 멤버 id(login_id), role 은 'admin' | 'member'. @returns {Promise<team>} */
export const updateMemberRoleApi = (teamId, memberId, role) =>
  request(`/teams/${encodeURIComponent(teamId)}/member-role`, {
    method: 'PATCH',
    body: JSON.stringify({ memberId, role }),
  })

/** 모임 장소를 내 지도에도 자동 저장할지 (사람마다·모임마다 따로) */
export const updateTeamSyncSetting = (teamId, syncToPersonal) =>
  request(`/teams/${encodeURIComponent(teamId)}/sync-setting`, {
    method: 'PATCH',
    body: JSON.stringify({ syncToPersonal }),
  })

/** 초대 링크 전체(…/login?invite=코드)나 코드만 입력해도 코드를 꺼낸다 */
export function parseInviteCode(input) {
  const value = input.trim()
  try {
    return new URL(value).searchParams.get('invite') || value
  } catch {
    return value // URL 형식이 아니면 코드 자체로 본다
  }
}
