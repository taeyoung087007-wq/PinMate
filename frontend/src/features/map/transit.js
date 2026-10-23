/**
 * 대중교통 길찾기 — ODsay LAB (웹/URI 키)
 * - 등록한 도메인(http://localhost:5173 등)에서만 동작하는 키라 브라우저에서 바로 호출한다
 * - 좌표는 모두 { lat, lng } / [lat, lng] 로 바꿔서 돌려준다 (ODsay 는 x=경도, y=위도)
 */
const BASE_URL = 'https://api.odsay.com/v1/api'

// ODsay 오류 코드 → 사용자 문구
const ERROR_MESSAGE = {
  '-98': '출발지와 도착지가 700m 이내라 대중교통 경로가 없어요. 도보를 이용해 보세요.',
  '-99': '이 구간은 대중교통 경로를 찾지 못했어요.',
  3: '출발지 근처에 정류장이 없어요.',
  4: '도착지 근처에 정류장이 없어요.',
  5: '출발지와 도착지 근처에 정류장이 없어요.',
}

// 버스 종류(ODsay lane.type) → 색 (서울 기준 색 체계를 따른다)
const BUS_COLORS = { 11: '#3D5BAB', 12: '#5BB025', 13: '#F2B70A', 14: '#E60012', 4: '#E60012', 3: '#5BB025', 6: '#AA6C3B' }
const DEFAULT_BUS_COLOR = '#33A852'
// 수도권 지하철 호선(subwayCode) → 색
const SUBWAY_COLORS = {
  1: '#0052A4', 2: '#00A84D', 3: '#EF7C1C', 4: '#00A5DE', 5: '#996CAC',
  6: '#CD7C2F', 7: '#747F00', 8: '#E6186C', 9: '#BDB092',
}
const DEFAULT_SUBWAY_COLOR = '#6C63FF'

const busColor = type => BUS_COLORS[type] ?? DEFAULT_BUS_COLOR
const subwayColor = code => SUBWAY_COLORS[code] ?? DEFAULT_SUBWAY_COLOR

async function call(path, params) {
  const apiKey = import.meta.env.VITE_ODSAY_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('대중교통 길찾기 키가 없습니다. frontend/.env 에 VITE_ODSAY_API_KEY 를 넣고 개발 서버를 다시 시작하세요.')
  }
  const query = new URLSearchParams({ ...params, apiKey })
  const res = await fetch(`${BASE_URL}/${path}?${query}`)
  const json = await res.json().catch(() => null)
  if (!json) throw new Error('대중교통 길찾기에 실패했습니다. 잠시 후 다시 시도해 주세요.')

  // 오류는 { error: { code, msg } } 또는 { error: [{ code, message }] } 두 형태로 온다
  const error = Array.isArray(json.error) ? json.error[0] : json.error
  if (error) {
    throw new Error(ERROR_MESSAGE[error.code] ?? error.msg ?? error.message ?? '대중교통 길찾기에 실패했습니다.')
  }
  return json.result
}

function toLeg(sub) {
  const base = { minutes: sub.sectionTime ?? 0, distance: sub.distance ?? 0 }
  if (sub.trafficType === 3) return { ...base, kind: 'walk' }

  const lanes = sub.lane ?? []
  const isBus = sub.trafficType === 2
  return {
    ...base,
    kind: isBus ? 'bus' : 'subway',
    // 같은 구간을 가는 버스가 여러 대면 모두 보여준다 ("509, 747")
    names: isBus ? lanes.map(l => l.busNo) : lanes.slice(0, 1).map(l => l.name),
    color: isBus ? busColor(lanes[0]?.type) : subwayColor(lanes[0]?.subwayCode),
    startName: sub.startName,
    endName: sub.endName,
    stationCount: sub.stationCount ?? 0,
    start: { lat: sub.startY, lng: sub.startX },
    end: { lat: sub.endY, lng: sub.endX },
    // 실시간 도착(TAGO)에 쓰는 공공 ID
    stationId: sub.startLocalStationID ?? null,
    routeIds: isBus ? lanes.map(l => l.busLocalBlID).filter(Boolean) : [],
  }
}

/**
 * 대중교통 경로 후보 (ODsay 추천 순서 그대로)
 * @returns {Promise<Array<{ totalMinutes, payment, transfers, walkMinutes, mapObj, legs }>>}
 */
export async function searchTransit(origin, dest) {
  const result = await call('searchPubTransPathT', {
    SX: origin.lng, SY: origin.lat, EX: dest.lng, EY: dest.lat,
  })
  return (result?.path ?? []).map(path => {
    const legs = (path.subPath ?? []).map(toLeg)
    return {
      totalMinutes: path.info.totalTime,
      payment: path.info.payment,
      transfers: Math.max(0, (path.info.busTransitCount ?? 0) + (path.info.subwayTransitCount ?? 0) - 1),
      walkMinutes: legs.filter(l => l.kind === 'walk').reduce((sum, l) => sum + l.minutes, 0),
      mapObj: path.info.mapObj,
      legs,
    }
  })
}

/**
 * 경로 후보의 실제 노선 모양 (버스·지하철 구간). 도보 구간은 포함되지 않는다
 * @returns {Promise<Array<{ color: string, path: Array<[number, number]> }>>}
 */
export async function loadTransitLines(mapObj) {
  const result = await call('loadLane', { mapObject: `0:0@${mapObj}` })
  return (result?.lane ?? []).map(lane => ({
    // class 1 = 버스, 2 = 지하철
    color: lane.class === 2 ? subwayColor(lane.type) : busColor(lane.type),
    path: (lane.section ?? []).flatMap(section => (section.graphPos ?? []).map(p => [p.y, p.x])),
  }))
}

export const formatMinutes = minutes =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`
