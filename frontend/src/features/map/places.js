import { loadKakaoMaps } from '../../lib/kakaoMaps'

/**
 * 장소(상가) 검색 — 카카오 지도 SDK의 services.Places
 * - JavaScript 키만으로 브라우저에서 바로 호출한다 (예전 백엔드 NAVER 프록시 불필요)
 * - 결과 형태: { name, category, address, lat, lng }
 *   category 는 "음식점>치킨" 처럼 상위 두 단계만 남긴다 (guessCategory·말풍선 표시용)
 */

// 지도 클릭 시 1차로 찾는 분류: 지도 라벨 대부분이 음식점·카페다
const PRIMARY_CATEGORIES = ['FD6', 'CE7']
// 1차에서 못 찾으면 나머지 분류를 한 번에 찾는다
// (관광명소, 숙박, 문화시설, 대형마트, 편의점, 병원, 약국, 은행, 지하철역, 주유소, 학원, 공공기관)
const SECONDARY_CATEGORIES = ['AT4', 'AD5', 'CT1', 'MT1', 'CS2', 'HP8', 'PM9', 'BK9', 'SW8', 'OL7', 'AC5', 'PO3']

function toPlace(item) {
  const category = (item.category_name ?? '')
    .split('>')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('>')
  return {
    name: item.place_name,
    category,
    address: item.road_address_name || item.address_name || '',
    lat: Number(item.y),
    lng: Number(item.x),
  }
}

/**
 * Places 콜백 API를 Promise 로. 결과 없음은 빈 배열, 오류만 reject
 * 카카오 시그니처는 method(검색어·분류코드, callback, options) 로 콜백이 가운데에 온다
 */
function call(method, target, options) {
  return loadKakaoMaps().then(
    maps =>
      new Promise((resolve, reject) => {
        new maps.services.Places()[method](
          target,
          (result, status) => {
            if (status === maps.services.Status.OK) resolve((result ?? []).map(toPlace))
            else if (status === maps.services.Status.ZERO_RESULT) resolve([])
            else reject(new Error('장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
          },
          options
        )
      })
  )
}

/**
 * 상호명으로 장소를 검색한다 (장소 추가 모달의 검색창)
 * @returns {Promise<Array<{name: string, category: string, address: string, lat: number, lng: number}>>}
 */
export function searchPlaces(query) {
  return call('keywordSearch', query, { size: 10 })
}

/**
 * 누른 좌표에서 radiusMeters 안에 있는 가장 가까운 상가.
 * 네이버 검색처럼 검색어를 추측하지 않고 "좌표 + 반경"으로 주변 상가를 거리순으로 받는다.
 * @param {{ building?: string }} options 역지오코딩의 건물명. 분류에 없는 상가(갤러리 등)를 보완한다
 * @returns {Promise<{name: string, category: string, address: string, lat: number, lng: number} | null>}
 */
export async function findNearestPlace(lat, lng, radiusMeters, { building = '' } = {}) {
  const radius = Math.max(1, Math.ceil(radiusMeters))
  const near = { x: lng, y: lat, radius, sort: 'distance' }
  const search = codes =>
    Promise.all(codes.map(code => call('categorySearch', code, near).catch(() => [])))
      .then(lists => lists.flat())

  const first = await Promise.all([
    search(PRIMARY_CATEGORIES),
    building ? call('keywordSearch', building, near).catch(() => []) : [],
  ])
  const found = pickNearest(first.flat(), lat, lng, radius)
  if (found) return found

  // 2차는 분류 12개를 동시에 호출한다(클릭당 최대 15회). 사용량이 문제 되면 분류를 줄인다
  return pickNearest(await search(SECONDARY_CATEGORIES), lat, lng, radius)
}

/** 좌표가 있는 후보 중 (lat, lng)에서 maxMeters 안의 가장 가까운 것 */
export function pickNearest(places, lat, lng, maxMeters) {
  let best = null
  let bestDistance = Infinity
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
    const d = distanceMeters(lat, lng, place.lat, place.lng)
    if (d <= maxMeters && d < bestDistance) {
      best = place
      bestDistance = d
    }
  }
  return best
}

// 평면 근사. 수십 km 안쪽은 오차가 1% 정도라 충분하다 (가게 찾기·역까지 거리 어림)
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dy = (lat2 - lat1) * 111_320
  const dx = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dx, dy)
}
