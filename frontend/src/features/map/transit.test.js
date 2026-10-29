import { describe, expect, it } from 'vitest'
import { formatMinutes, nextTrains, seoulStationName, seoulSubwayId } from './transit'

describe('formatMinutes', () => {
  it('1시간 미만은 분으로만 표시한다', () => {
    expect(formatMinutes(59)).toBe('59분')
  })

  it('1시간 이상은 시간과 분으로 나눈다', () => {
    expect(formatMinutes(60)).toBe('1시간 0분')
    expect(formatMinutes(125)).toBe('2시간 5분')
  })
})

describe('seoulSubwayId', () => {
  it('1~9호선은 서울시 API 노선 ID 로 바꾼다', () => {
    expect(seoulSubwayId(2)).toBe('1002')
    expect(seoulSubwayId(9)).toBe('1009')
  })

  it('그 외 노선은 null (시간표로 대신한다)', () => {
    expect(seoulSubwayId(10)).toBeNull()
    expect(seoulSubwayId(0)).toBeNull()
  })
})

describe('seoulStationName', () => {
  it('"역"을 떼고 서울시 API 표기를 쓴다', () => {
    expect(seoulStationName('서울역')).toBe('서울')
    expect(seoulStationName('역삼')).toBe('역삼')
  })

  it('부역명이 붙은 역은 전체 이름으로 바꾼다', () => {
    expect(seoulStationName('이수역')).toBe('총신대입구(이수)')
    expect(seoulStationName('숭실대입구')).toBe('숭실대입구(살피재)')
  })
})

// 시간표 응답 형태: OrdList/SatList/SunList → up/down → time[{ Idx, list }]
const timetable = {
  OrdList: { up: { time: [{ Idx: 9, list: '10(판암) 25(판암)' }] } },
  SatList: { up: { time: [{ Idx: 9, list: '30(판암)' }] } },
  SunList: { up: { time: [{ Idx: 9, list: '40(판암)' }] } },
}

describe('nextTrains', () => {
  it('평일에는 평일 시간표에서 지금 이후 열차를 고른다', () => {
    const thu = new Date(2026, 9, 29, 9, 0) // 2026-10-29 목
    expect(nextTrains(timetable, 1, thu)).toEqual([
      { minutes: 10, destination: '판암' },
      { minutes: 25, destination: '판암' },
    ])
  })

  it('토요일은 토요일 시간표를 쓴다', () => {
    const sat = new Date(2026, 9, 31, 9, 0) // 2026-10-31 토
    expect(nextTrains(timetable, 1, sat)).toEqual([{ minutes: 30, destination: '판암' }])
  })

  it('일요일과 공휴일은 휴일 시간표를 쓴다', () => {
    const sun = new Date(2026, 10, 1, 9, 0) // 2026-11-01 일
    expect(nextTrains(timetable, 1, sun)).toEqual([{ minutes: 40, destination: '판암' }])

    const holiday = new Date(2026, 9, 30, 9, 0) // 2026-10-30 금, 공휴일로 지정
    expect(nextTrains(timetable, 1, holiday, 2, ['2026-10-30'])).toEqual([
      { minutes: 40, destination: '판암' },
    ])
  })

  it('이미 지난 열차는 빼고, count 만큼만 돌려준다', () => {
    const thu = new Date(2026, 9, 29, 9, 20) // 9:20 — 9:10 은 지났다
    expect(nextTrains(timetable, 1, thu, 1)).toEqual([{ minutes: 5, destination: '판암' }])
  })

  it('시간표가 없으면 빈 배열', () => {
    expect(nextTrains(null, 1, new Date(2026, 9, 29, 9, 0))).toEqual([])
  })
})
