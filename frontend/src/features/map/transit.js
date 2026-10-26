/**
 * 대중교통 길찾기 — ODsay LAB (웹/URI 키)
 * - 등록한 도메인(http://localhost:5173 등)에서만 동작하는 키라 브라우저에서 바로 호출한다
 * - 좌표는 모두 { lat, lng } / [lat, lng] 로 바꿔서 돌려준다 (ODsay 는 x=경도, y=위도)
 */
const BASE_URL = 'https://api.odsay.com/v1/api'

// 도보 구간 색. 도보 길찾기와 대중교통 안의 도보 구간을 같은 색(청록 점선)으로 그린다
export const WALK_COLOR = '#14B8A6'

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

// ODsay 무료 플랜은 일일 호출 한도가 작아서 결과를 저장해 두고 다시 쓴다
// - 경로 검색: 탭 세션(sessionStorage) 10분 — 배차·상황이 바뀌므로 짧게
// - 노선 모양·지하철 시간표: 브라우저(localStorage) 1일 — 거의 바뀌지 않음
const CACHE_PREFIX = 'odsay:'
const MINUTE = 60_000
const SEARCH_TTL = 10 * MINUTE
const STATIC_TTL = 24 * 60 * MINUTE

// 같은 요청이 동시에 여러 번 나가지 않게 (개발 모드의 effect 2번 실행, 빠른 연속 클릭)
const inflight = new Map()

function readCache(storage, key) {
  try {
    const entry = JSON.parse(storage.getItem(CACHE_PREFIX + key))
    if (entry && entry.expires > Date.now()) return entry.value
    if (entry) storage.removeItem(CACHE_PREFIX + key)
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 캐시 없이 동작
  }
  return undefined
}

function writeCache(storage, key, value, ttl) {
  const item = JSON.stringify({ value, expires: Date.now() + ttl })
  try {
    storage.setItem(CACHE_PREFIX + key, item)
  } catch {
    // 용량이 차면 우리 캐시만 비우고 한 번 더 시도
    try {
      Object.keys(storage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => storage.removeItem(k))
      storage.setItem(CACHE_PREFIX + key, item)
    } catch {
      // 그래도 안 되면 저장하지 않는다
    }
  }
}

/** call() 결과를 저장소에 ttl 동안 저장해 두고 다시 쓴다. 실패한 응답은 저장하지 않는다 */
function cachedCall(path, params, { storage, ttl }) {
  const key = `${path}?${new URLSearchParams(params)}`
  const cached = readCache(storage, key)
  if (cached !== undefined) return Promise.resolve(cached)
  if (!inflight.has(key)) {
    inflight.set(key, call(path, params)
      .then(result => {
        writeCache(storage, key, result, ttl)
        return result
      })
      .finally(() => inflight.delete(key)))
  }
  return inflight.get(key)
}

// 좌표를 약 50m 격자로 맞춘다. GPS 가 몇 m 흔들려도 같은 검색으로 보고 캐시를 쓰게
// (대중교통은 가까운 정류장을 찾는 것이라 이 정도 차이는 결과에 영향이 없다)
const GRID = 0.0005
const snap = value => (Math.round(value / GRID) * GRID).toFixed(4)

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
    // 네이버 지도식 상세 안내용
    // 막대·배지에는 방면을 뺀 번호만 ("1003(반석역방면)" → "1003")
    badge: isBus ? (lanes[0]?.busNo ?? '').replace(/\s*\(.*\)\s*$/, '') : subwayBadge(lanes[0]?.name),
    way: sub.way ?? null, // 지하철 방면 (예: "충무로")
    startExit: validExit(sub.startExitNo),
    endExit: validExit(sub.endExitNo),
    interval: sub.intervalTime ?? null, // 배차 간격(분)
    stopNo: sub.startArsID ?? null, // 버스 정류장 번호 (예: "02151")
    // 지하철 다음 열차(시간표·실시간)에 쓰는 값
    odsayStationId: isBus ? null : sub.startID ?? null,
    wayCode: isBus ? null : sub.wayCode ?? null, // 1 상행, 2 하행
    nextStop: isBus ? null : sub.passStopList?.stations?.[1]?.stationName ?? null, // 바로 다음 역 (way 는 종착 쪽 역일 때가 있다)
    subwayCode: isBus ? null : lanes[0]?.subwayCode ?? null,
  }
}

// "수도권 4호선" → "4", "수도권 신분당선" → "신분당"
function subwayBadge(name) {
  if (!name) return ''
  const line = name.match(/(\d+)호선/)
  if (line) return line[1]
  return name.replace(/^(수도권|대전|대구|부산|광주)\s*/, '').replace(/선$/, '')
}

// ODsay 는 출구가 없으면 "null" 문자열을 주기도 한다
const validExit = no => (no && no !== 'null' ? no : null)

/**
 * 대중교통 경로 후보 (ODsay 추천 순서 그대로)
 * @returns {Promise<Array<{ totalMinutes, payment, transfers, walkMinutes, mapObj, legs }>>}
 */
export async function searchTransit(origin, dest) {
  const result = await cachedCall('searchPubTransPathT', {
    SX: snap(origin.lng), SY: snap(origin.lat), EX: snap(dest.lng), EY: snap(dest.lat),
  }, { storage: sessionStorage, ttl: SEARCH_TTL })
  const paths = result?.path ?? []
  // 먼 거리면 기차·고속·시외버스(구간 trafficType 4~7) 경로만 온다. 노선 모양(mapObj)·요금 필드가 달라서 시내 경로만 쓴다
  const cityPaths = paths.filter(path => path.info?.mapObj && (path.subPath ?? []).every(sub => sub.trafficType <= 3))
  if (paths.length > 0 && cityPaths.length === 0) {
    throw new Error('거리가 멀어 기차·고속버스 경로만 있어요. 시외 이동은 아직 지원하지 않아요.')
  }
  return cityPaths.map(path => {
    const legs = (path.subPath ?? []).map(toLeg)
    return {
      totalMinutes: path.info.totalTime,
      payment: path.info.payment ?? 0,
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
  const result = await cachedCall('loadLane', { mapObject: `0:0@${mapObj}` }, { storage: localStorage, ttl: STATIC_TTL })
  return (result?.lane ?? []).map(lane => ({
    // class 1 = 버스, 2 = 지하철
    color: lane.class === 2 ? subwayColor(lane.type) : busColor(lane.type),
    path: (lane.section ?? []).flatMap(section => (section.graphPos ?? []).map(p => [p.y, p.x])),
  }))
}

export const formatMinutes = minutes =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`

/** ODsay 지하철 역 시간표 (평일·토·휴일, 상행·하행). 거의 바뀌지 않아 하루 동안 저장해 둔다 */
export function loadSubwayTimetable(stationId) {
  return cachedCall('subwayTimeTable', { stationID: stationId }, { storage: localStorage, ttl: STATIC_TTL })
}

/**
 * 시간표에서 now 이후 열차 n개. [{ minutes, destination }]
 * - 시간표의 Idx 는 시(5~25), list 는 "04(판암) 10(판암)…" 형태
 * - 새벽 3시 전이면 전날(운행일) 시간표의 24·25시 열차로 본다
 * - 운행일이 공휴일(holidays: ["2026-03-02", …])이거나 일요일이면 휴일 시간표
 */
export function nextTrains(table, wayCode, now = new Date(), count = 2, holidays = []) {
  const serviceDay = now.getHours() < 3 ? new Date(now.getTime() - 24 * 60 * MINUTE) : now
  const day = serviceDay.getDay()
  const isHoliday = day === 0 || holidays.includes(localDate(serviceDay))
  const list = isHoliday ? table?.SunList : day === 6 ? table?.SatList : table?.OrdList
  const times = list?.[wayCode === 1 ? 'up' : 'down']?.time ?? []
  let nowMin = now.getHours() * 60 + now.getMinutes()
  if (now.getHours() < 3) nowMin += 24 * 60

  const trains = []
  for (const { Idx, list: entries } of times) {
    for (const token of String(entries ?? '').split(/\s+/)) {
      const m = token.match(/^(\d{1,2})\(([^)]*)\)/)
      if (!m) continue
      const at = Number(Idx) * 60 + Number(m[1])
      if (at >= nowMin) trains.push({ minutes: at - nowMin, destination: m[2] })
    }
  }
  return trains.sort((a, b) => a.minutes - b.minutes).slice(0, count)
}

// 서울시 실시간 API 의 노선 ID (1~9호선만 확실하다. 나머지 노선은 시간표로 대신한다)
export const seoulSubwayId = subwayCode => (subwayCode >= 1 && subwayCode <= 9 ? String(1000 + subwayCode) : null)

// ODsay 역 이름 → 서울시 API 역 이름 ("서울역" → "서울", "역삼" 은 그대로)
export const seoulStationName = name => (name ?? '').replace(/역$/, '')

// 로컬 기준 "2026-03-02" (toISOString 은 UTC 라 새벽에 날짜가 하루 밀린다)
function localDate(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

