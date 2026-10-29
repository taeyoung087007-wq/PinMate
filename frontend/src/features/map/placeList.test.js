import { describe, expect, it } from 'vitest'
import { filterAndSortPins } from './placeList'

const pin = (id, name, { recommends = 0, approved = false, createdAt = null, address = '' } = {}) => ({
  id,
  name,
  address,
  isAllApproved: approved,
  createdAt,
  recommenders: Array.from({ length: recommends }, (_, i) => `u${i}`),
})

describe('filterAndSortPins', () => {
  it('모두 인정 장소를 항상 위 그룹으로 나눈다', () => {
    const pins = [pin(1, '가게A'), pin(2, '가게B', { approved: true })]

    const { approved, rest } = filterAndSortPins(pins)

    expect(approved.map(p => p.id)).toEqual([2])
    expect(rest.map(p => p.id)).toEqual([1])
  })

  it('기본 정렬은 추천 많은 순이다', () => {
    const pins = [pin(1, 'A', { recommends: 1 }), pin(2, 'B', { recommends: 3 }), pin(3, 'C', { recommends: 2 })]

    const { rest } = filterAndSortPins(pins)

    expect(rest.map(p => p.id)).toEqual([2, 3, 1])
  })

  it('최신순은 createdAt 내림차순이다', () => {
    const pins = [
      pin(1, 'A', { createdAt: '2026-10-01T00:00:00Z' }),
      pin(2, 'B', { createdAt: '2026-10-20T00:00:00Z' }),
    ]

    const { rest } = filterAndSortPins(pins, { sort: 'recent' })

    expect(rest.map(p => p.id)).toEqual([2, 1])
  })

  it('이름순은 한글 사전순이다', () => {
    const pins = [pin(1, '다방'), pin(2, '가게'), pin(3, '나루')]

    const { rest } = filterAndSortPins(pins, { sort: 'name' })

    expect(rest.map(p => p.name)).toEqual(['가게', '나루', '다방'])
  })

  it('검색어는 이름과 주소에 모두 적용된다', () => {
    const pins = [
      pin(1, '성수 카페', { address: '서울 성동구' }),
      pin(2, '대림창고', { address: '서울 마포구' }),
    ]

    expect(filterAndSortPins(pins, { query: '성수' }).total).toBe(1)
    expect(filterAndSortPins(pins, { query: '마포' }).total).toBe(1)
    expect(filterAndSortPins(pins, { query: '부산' }).total).toBe(0)
  })

  it('검색어 앞뒤 공백과 대소문자는 무시한다', () => {
    const pins = [pin(1, 'Cafe Seoul')]

    expect(filterAndSortPins(pins, { query: '  cafe  ' }).total).toBe(1)
  })

  it('빈 검색어는 전체를 보여준다', () => {
    const pins = [pin(1, 'A'), pin(2, 'B')]

    expect(filterAndSortPins(pins, { query: '   ' }).total).toBe(2)
  })
})
