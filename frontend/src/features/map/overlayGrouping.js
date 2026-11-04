import { distanceMeters } from './places'

const SAME_PLACE_METERS = 50
const nameKey = name => (name || '').replace(/\s/g, '').toLowerCase()

const samePlace = (a, b) =>
  nameKey(a.name) === nameKey(b.name) &&
  distanceMeters(a.lat, a.lng, b.lat, b.lng) < SAME_PLACE_METERS

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
      const group = groups.find(g => samePlace(g.pin, pin))
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
    const match = scopePins.find(p => samePlace(p, group.pin))
    const recommenders = match?.recommenders ?? []
    const hasMyPin = myPins.some(p => samePlace(p, group.pin))

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
