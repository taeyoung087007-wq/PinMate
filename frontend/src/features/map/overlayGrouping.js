import { isSamePlace } from './places'

/**
 * 친구 오버레이 핀을 같은 장소끼리 묶는다.
 * - 여러 친구가 같은 곳을 저장했으면 핀 하나로 합치고 'N명이 추천' 태그를 붙인다
 * - 지금 지도(팀 핀)에 같은 장소가 있으면 그 추천인 수도 합산한다
 * - 내가 그 팀 핀을 추천했으면 '나 외 N명이 추천' 으로 쓴다
 *
 * @param {Array<{ friend: object, pins: Array }>} friendOverlays
 * @param {Array} scopePins 지금 보고 있는 지도의 핀 (팀 핀 또는 내 개인 핀)
 * @param {string|null} myLoginId
 * @param {Array} myPins 내 개인 핀 (친구 핀을 내 지도에 추가했으면 나도 한 명으로 센다)
 */
export function groupFriendOverlayPins(friendOverlays, scopePins = [], myLoginId = null, myPins = []) {
  const groups = []

  friendOverlays.forEach(({ friend, pins = [] }) => {
    pins.forEach(pin => {
      const group = groups.find(g => isSamePlace(g.pin, pin))
      if (group) {
        if (!group.owners.some(o => String(o.id) === String(friend.id))) {
          group.owners.push({ id: friend.id, name: friend.nickname || friend.loginId })
        }
      } else {
        groups.push({ pin, owners: [{ id: friend.id, name: friend.nickname || friend.loginId }] })
      }
    })
  })

  return groups.map((group, index) => {
    const match = scopePins.find(p => isSamePlace(p, group.pin))
    const recommenders = match?.recommenders ?? []
    const hasMyPin = myPins.some(p => isSamePlace(p, group.pin))

    // 같은 곳을 가진 사람을 중복 없이 센다 (친구들 + 나 + 팀 추천인)
    const people = new Set()
    group.owners.forEach(owner => people.add(`f:${owner.id}`))
    if (hasMyPin) people.add('me')
    recommenders.forEach(id => people.add(id === myLoginId ? 'me' : `r:${id}`))

    const count = people.size
    const hasMe = people.has('me')

    let tag = group.owners[0]?.name || '친구 지도'
    if (count > 1) tag = hasMe ? `나 외 ${count - 1}명이 추천` : `${count}명이 추천`

    return { ...group.pin, overlayTag: tag, overlayIndex: index, overlayCount: count }
  })
}

/**
 * 레이어 출처(kind)를 붙여 오버레이 핀을 묶는다.
 * 친구 지도 / 모임원 공유 핀을 같은 모양으로 섞지 않고, 지도 위에서 서로 다른
 * 테두리·태그로 그릴 수 있도록 구분값을 심는다.
 *
 * @param {'friend'|'member'} kind 출처
 * @param {Array<{ friend: object, pins: Array }>} overlays
 * @param {Array} scopePins 지금 보고 있는 지도의 핀
 * @param {string|null} myLoginId
 * @param {Array} myPins 내 개인 핀
 */
export function groupLayerPins(kind, overlays, scopePins = [], myLoginId = null, myPins = []) {
  return groupFriendOverlayPins(overlays, scopePins, myLoginId, myPins).map(pin => ({
    ...pin,
    overlayKind: kind,
    overlayTag: kind === 'member' ? `모임원 · ${pin.overlayTag || '공유'}` : pin.overlayTag,
  }))
}
