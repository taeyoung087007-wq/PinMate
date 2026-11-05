import { useEffect, useState } from 'react'
import {
  fetchSyncNotifications,
  fetchSyncNotificationCount,
  applySyncNotification,
  ignoreSyncNotification,
  applyAllSyncNotifications,
  ignoreAllSyncNotifications,
} from './api'

/**
 * 동기화 알림 (모임 장소 추가·삭제를 내 지도에 반영할지)
 * - 처리 안 한 개수는 앱을 열 때 한 번 읽어 배지로 보여준다
 * - 반영하면 내 지도가 바뀌므로 onApplied 로 개인 장소를 다시 읽게 한다
 */
export function useSyncNotifications({ onError, onApplied }) {
  const [items, setItems] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null) // 처리 중인 알림 id, `team-{모임 id}` 또는 `batch-{묶음 첫 알림 id}`

  useEffect(() => {
    let cancelled = false
    fetchSyncNotificationCount()
      .then(data => { if (!cancelled) setPendingCount(data.pending ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchSyncNotifications()
      setItems(data.items ?? [])
      setPendingCount(data.pendingCount ?? 0)
    } catch (e) {
      onError(`알림을 불러오지 못했습니다: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const refreshCount = () => {
    fetchSyncNotificationCount()
      .then(data => setPendingCount(data.pending ?? 0))
      .catch(() => {})
  }

  // 한 건·모임 단위 처리 공통: 처리 중 표시 → 요청 → 목록(반영이면 내 지도도) 다시 읽기
  const run = async (busy, request, applied) => {
    setBusyId(busy)
    try {
      await request()
      await Promise.all([load(), applied && onApplied()])
    } catch (e) {
      onError(`알림을 ${applied ? '반영' : '무시'}하지 못했습니다: ${e.message}`)
    } finally {
      setBusyId(null)
    }
  }

  return {
    items,
    pendingCount,
    loading,
    busyId,
    load,
    refreshCount,
    apply: item => run(item.id, () => applySyncNotification(item.id), true),
    ignore: item => run(item.id, () => ignoreSyncNotification(item.id), false),
    applyAll: teamId => run(`team-${teamId}`, () => applyAllSyncNotifications(teamId), true),
    ignoreAll: teamId => run(`team-${teamId}`, () => ignoreAllSyncNotifications(teamId), false),
    // 한 번에 생긴 묶음(가져오기로 여러 곳). 한 건씩 같은 API 를 부른다
    applyMany: (items, busy) => run(busy, () => Promise.all(items.map(i => applySyncNotification(i.id))), true),
    ignoreMany: (items, busy) => run(busy, () => Promise.all(items.map(i => ignoreSyncNotification(i.id))), false),
  }
}
