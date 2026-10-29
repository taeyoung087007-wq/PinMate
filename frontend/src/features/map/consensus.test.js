import { describe, expect, it } from 'vitest'
import { isMajority, memberRecommendCount } from './consensus'

const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('memberRecommendCount', () => {
  it('현재 팀원의 추천만 센다', () => {
    // 'x' 는 떠난 멤버라 세지 않는다 (서버의 모두 인정 판정과 같게)
    expect(memberRecommendCount({ recommenders: ['a', 'x'] }, members)).toBe(1)
  })

  it('추천이 없으면 0', () => {
    expect(memberRecommendCount({ recommenders: [] }, members)).toBe(0)
  })
})

describe('isMajority', () => {
  it('3명 중 2명이 추천하면 과반이다', () => {
    expect(isMajority({ recommenders: ['a', 'b'] }, members)).toBe(true)
  })

  it('3명 중 1명이면 과반이 아니다', () => {
    expect(isMajority({ recommenders: ['a'] }, members)).toBe(false)
  })

  it('2명 팀은 과반 판정을 하지 않는다 (모두 인정만 있다)', () => {
    expect(isMajority({ recommenders: ['a'] }, [{ id: 'a' }, { id: 'b' }])).toBe(false)
  })

  it('이미 모두 인정이면 과반이 아니다', () => {
    expect(isMajority({ recommenders: ['a', 'b', 'c'], isAllApproved: true }, members)).toBe(false)
  })
})
