import { useEffect, useState } from 'react'
import { fetchFriends, fetchFriendPlaces } from '../friends/api'

/**
 * 친구 목록과 친구 지도 레이어 (내 지도 위에 여러 친구를 겹쳐 볼 수 있다)
 * - 친구 목록·받은 요청 수는 앱을 열 때 한 번 읽는다. 친구 패널을 닫으면 refresh 로 다시 읽는다
 * - overlays: [{ friend, pins, key }]
 */
export function useFriendLayers({ onError }) {
  const [friends, setFriends] = useState([])
  const [pendingCount, setPendingCount] = useState(0) // 받은 친구 요청 수 (배지)
  const [overlays, setOverlays] = useState([])

  const applyOverview = data => {
    setPendingCount(data.pendingCount ?? 0)
    setFriends(data.friends ?? [])
  }

  useEffect(() => {
    let cancelled = false
    fetchFriends()
      .then(data => { if (!cancelled) applyOverview(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const refresh = () => {
    fetchFriends().then(applyOverview).catch(() => {})
  }

  const isOn = friend => overlays.some(o => String(o.friend.id) === String(friend.id))

  // 친구 레이어를 켜고 끈다
  const toggle = async friend => {
    if (isOn(friend)) {
      setOverlays(prev => prev.filter(o => String(o.friend.id) !== String(friend.id)))
      return
    }
    try {
      const places = await fetchFriendPlaces(friend.id)
      setOverlays(prev => [...prev, { friend, pins: places, key: Date.now() }])
      if (places.length === 0) {
        onError(`${friend.nickname || friend.loginId}님이 공개한 장소가 없습니다.`)
      }
    } catch (e) {
      onError(`친구 지도를 불러오지 못했습니다: ${e.message}`)
    }
  }

  // 모두 선택 (아직 안 켠 친구만 불러와서 더한다. 못 불러온 친구는 건너뛴다)
  const selectAll = async () => {
    const missing = friends.filter(f => !isOn(f))
    if (missing.length === 0) return
    const results = await Promise.all(missing.map(async (friend, index) => {
      try {
        return { friend, pins: await fetchFriendPlaces(friend.id), key: Date.now() + index }
      } catch {
        return null
      }
    }))
    setOverlays(prev => [...prev, ...results.filter(Boolean)])
  }

  return { friends, pendingCount, overlays, refresh, toggle, selectAll, clear: () => setOverlays([]) }
}
