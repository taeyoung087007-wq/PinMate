import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchTeamMemberPins } from './api'

/**
 * 모임원이 공개한 핀 레이어. 모임 지도에서만 보여준다 (내 지도에는 노출하지 않는다)
 * - 모임을 바꿀 때마다 새로 읽고, 이미 읽은 모임이면 다시 요청하지 않는다
 * - overlays: 모임원별로 묶어 친구 레이어와 같은 모양 [{ friend, pins }]
 */
export function useMemberPins({ mapScope, teamId, onError }) {
  const [pins, setPins] = useState([])
  const [show, setShow] = useState(false)
  const loadedTeamRef = useRef(null) // 어느 모임의 핀을 이미 불러왔는지

  useEffect(() => {
    if (mapScope !== 'team' || !teamId) return
    const key = String(teamId)
    if (loadedTeamRef.current === key) return
    loadedTeamRef.current = key

    fetchTeamMemberPins(teamId)
      .then(places => {
        if (loadedTeamRef.current !== key) return // 그새 다른 모임으로 바뀌었으면 버린다
        setPins(places)
        setShow(places.length > 0)
      })
      .catch(() => {
        if (loadedTeamRef.current !== key) return
        setPins([])
        setShow(false)
      })
  }, [mapScope, teamId])

  const toggle = async () => {
    if (show) {
      setShow(false)
      return
    }
    if (!teamId) return
    try {
      const places = await fetchTeamMemberPins(teamId)
      loadedTeamRef.current = String(teamId)
      setPins(places)
      setShow(places.length > 0)
      if (places.length === 0) onError('모임원이 공개한 장소가 없습니다.')
    } catch (e) {
      onError(`모임원 공유 핀을 불러오지 못했습니다: ${e.message}`)
    }
  }

  const overlays = useMemo(() => {
    if (mapScope !== 'team' || !show) return []
    const byOwner = new Map()
    pins.forEach(pin => {
      const id = pin.ownerId || pin.ownerLoginId
      if (!byOwner.has(id)) {
        byOwner.set(id, { friend: { id, nickname: pin.owner, loginId: pin.ownerLoginId }, pins: [] })
      }
      byOwner.get(id).pins.push(pin)
    })
    return [...byOwner.values()]
  }, [mapScope, show, pins])

  return { pins, show, overlays, toggle, hide: () => setShow(false) }
}
