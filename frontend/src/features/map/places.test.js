import { describe, it, expect } from 'vitest'
import { isSamePlace } from './places'

const place = (name, lat, lng, kakaoPlaceId) => ({ name, lat, lng, kakaoPlaceId })

describe('isSamePlace', () => {
  it('카카오 장소 ID가 같으면 이름이 달라도 같은 장소', () => {
    expect(isSamePlace(place('스타벅스 오송점', 36.62, 127.32, '123'), place('스타벅스오송역점', 36.6203, 127.3204, '123'))).toBe(true)
  })

  it('ID가 없으면 이름이 같고 50m 안일 때만 같은 장소', () => {
    expect(isSamePlace(place('이자카야 탕', 36.62, 127.32), place('이자카야탕', 36.6202, 127.3202))).toBe(true)
    expect(isSamePlace(place('이자카야 탕', 36.62, 127.32), place('이자카야 탕', 36.63, 127.32))).toBe(false)
  })

  it('ID가 달라도 이름이 같고 50m 안이면 같은 장소로 본다 (서버와 같은 기준)', () => {
    expect(isSamePlace(place('이자카야 탕', 36.62, 127.32, '1'), place('이자카야 탕', 36.62, 127.32, '2'))).toBe(true)
  })

  it('한쪽만 ID가 있으면 이름 + 50m 로 판별한다', () => {
    expect(isSamePlace(place('나루', 36.62, 127.32, '9'), place('다른 가게', 36.62, 127.32))).toBe(false)
  })
})
