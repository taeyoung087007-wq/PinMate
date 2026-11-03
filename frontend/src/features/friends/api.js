import { request, post } from '../../lib/apiClient'

/** 친구 목록 + 받은 요청 + 보낸 요청 + 받은 요청 수 */
export const fetchFriends = () => request('/friends')

/** 아이디·닉네임으로 사용자 검색 (관계 상태 포함) */
export const searchFriendUsers = (query) =>
  request(`/friends/search?q=${encodeURIComponent(query)}`)

/** 친구 요청. 상대가 먼저 보냈으면 바로 수락된다 @returns {Promise<{status:'pending'|'accepted'|'already'}>} */
export const sendFriendRequest = (userId) => post('/friends/requests', { userId })

/** 받은 친구 요청 수락 */
export const acceptFriendRequest = (userId) =>
  post(`/friends/requests/${encodeURIComponent(userId)}/accept`, {})

/** 거절·요청 취소·끊기 (방향 무관) */
export const removeFriend = (userId) =>
  request(`/friends/${encodeURIComponent(userId)}`, { method: 'DELETE' })
