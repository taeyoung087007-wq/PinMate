import { describe, it, expect } from 'vitest'
import { groupFriendOverlayPins } from './overlayGrouping'

const friend = (id, nickname) => ({ id, nickname })
const place = (name, lat, lng, owner) => ({ name, lat, lng, owner })

describe('groupFriendOverlayPins', () => {
  it('같은 장소를 저장한 친구 둘은 핀 하나로 묶고 2명이 추천으로 표시한다', () => {
    const overlays = [
      { friend: friend(1, '태영'), pins: [place('이자카야 탕', 36.62, 127.31, '태영')] },
      { friend: friend(2, '무능한아기'), pins: [place('이자카야 탕', 36.62, 127.31, '무능한아기')] },
    ]

    const result = groupFriendOverlayPins(overlays, [], 'admin')

    expect(result).toHaveLength(1)
    expect(result[0].overlayCount).toBe(2)
    expect(result[0].overlayTag).toBe('2명이 추천')
  })

  it('팀 핀과 겹치고 내가 추천했으면 나 외 N명이 추천', () => {
    const overlays = [{ friend: friend(1, '태영'), pins: [place('이자카야 탕', 36.62, 127.31, '태영')] }]
    const scopePins = [{ name: '이자카야 탕', lat: 36.62, lng: 127.31, recommenders: ['admin', 'ds_kim1'] }]

    const result = groupFriendOverlayPins(overlays, scopePins, 'admin')

    // 나(admin) + ds_kim1 + 친구 태영 = 3명
    expect(result[0].overlayCount).toBe(3)
    expect(result[0].overlayTag).toBe('나 외 2명이 추천')
  })

  it('친구 핀을 내 지도에 추가하면 나까지 세서 2명이 된다', () => {
    const overlays = [{ friend: friend(1, '태영'), pins: [place('이자카야 탕', 36.62, 127.31, '태영')] }]
    const myPins = [{ name: '이자카야 탕', lat: 36.62, lng: 127.31 }]

    const result = groupFriendOverlayPins(overlays, [], 'admin', myPins)

    expect(result[0].overlayCount).toBe(2)
    expect(result[0].overlayTag).toBe('나 외 1명이 추천')
  })

  it('겹치지 않는 장소는 따로 남는다', () => {
    const overlays = [
      { friend: friend(1, '태영'), pins: [place('A', 36.62, 127.31, '태영'), place('B', 36.63, 127.32, '태영')] },
    ]

    expect(groupFriendOverlayPins(overlays, [], 'admin')).toHaveLength(2)
  })

  it('한 친구만 있으면 그 친구 이름을 태그로 쓴다', () => {
    const overlays = [{ friend: friend(1, '태영'), pins: [place('A', 36.62, 127.31, '태영')] }]

    expect(groupFriendOverlayPins(overlays, [], 'admin')[0].overlayTag).toBe('태영')
  })
})
