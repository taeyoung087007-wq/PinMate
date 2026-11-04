import { request, post } from '../../lib/apiClient'

/** 내 동기화 알림 목록 + 처리 안 한 개수 */
export const fetchSyncNotifications = () => request('/sync-notifications')

/** 배지용 처리 안 한 개수 */
export const fetchSyncNotificationCount = () => request('/sync-notifications/count')

/** 알림 반영: '추가'면 내 지도에 담기, '삭제'면 내 지도에서 지우기 */
export const applySyncNotification = (id) =>
  post(`/sync-notifications/${encodeURIComponent(id)}/apply`, {})

/** 알림 무시 */
export const ignoreSyncNotification = (id) =>
  post(`/sync-notifications/${encodeURIComponent(id)}/ignore`, {})

/** 모임의 처리 안 한 알림 모두 반영 */
export const applyAllSyncNotifications = (teamId) =>
  post('/sync-notifications/apply-all', { teamId })

/** 모임의 처리 안 한 알림 모두 무시 */
export const ignoreAllSyncNotifications = (teamId) =>
  post('/sync-notifications/ignore-all', { teamId })
