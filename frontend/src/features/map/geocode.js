import { loadNaverMaps } from '../../lib/naverMaps'
import { searchPlaces } from './api'

/**
 * 주소·장소명으로 좌표를 찾는다 (Geocoding)
 * - 네이버 지도 JS SDK의 geocoder 서브모듈을 쓴다.
 *   REST API(/map-geocode/v2)는 Client Secret이 필요하지만, 이 방식은 Client ID만으로 동작한다.
 * @param {string} query 예: "성수동 대림창고", "서울 마포구 어울마당로 35"
 * @returns {Promise<Array<{name: string, address: string, lat: number, lng: number}>>}
 */
export async function geocode(query) {
  const maps = await loadNaverMaps()

  return new Promise((resolve, reject) => {
    maps.Service.geocode({ query }, (status, response) => {
      if (status === maps.Service.Status.ERROR) {
        reject(new Error('주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
        return
      }
      if (status !== maps.Service.Status.OK) {
        resolve([])
        return
      }

      const addresses = response?.v2?.addresses ?? []
      resolve(
        addresses.map(item => ({
          // 도로명 주소가 있으면 그걸 이름처럼 쓰고, 없으면 지번
          name: item.roadAddress || item.jibunAddress || query,
          address: item.roadAddress || item.jibunAddress || '',
          lat: Number(item.y),
          lng: Number(item.x),
        }))
      )
    })
  })
}

/**
 * 좌표로 주소를 찾는다 (Reverse Geocoding)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string | null>} 주소 문자열, 찾지 못하면 null
 */
export async function reverseGeocode(lat, lng) {
  return formatAddress(await reverseGeocodeResult(lat, lng))
}

// 클릭한 곳과 이만큼 안에 있는 검색 결과만 "그 자리의 상가"로 본다 (같은 이름의 다른 지점 제외)
const BUILDING_NEARBY_METERS = 100
// 주소가 같아도 다른 지역의 같은 도로명일 수 있어 이 안으로 제한한다
const SAME_ADDRESS_METERS = 300
// 건물명이 없는 곳(지방 등)도 찾도록 "동 + 도로명 + 업종"으로도 검색한다 (예: "오송읍 봉산2길 맛집" → 특별횟집 오송점)
const ROAD_SEARCH_WORDS = ['맛집', '카페', '술집']

/**
 * 좌표에 있는 상가를 찾는다. 네이버 지도 JS API는 바탕 지도의 상호 클릭을 알려주지 않아서 지역 검색으로 추정한다.
 * - 검색어: 역지오코딩의 건물명(예: "성수동2가 대림창고") + 도로명과 흔한 업종(예: "오송읍 봉산2길 맛집")
 * - 고르는 순서 (네이버 지도처럼 라벨 근처를 눌러도 잡히게)
 *   1) 누른 곳에서 tapMeters(손가락 범위) 안의 상가: 건물명으로 시작 > 주소가 같음 > 가장 가까움
 *   2) 건물명으로 찾은 상가 (같은 건물 입점 매장보다 건물 자체 우선)
 *   3) 주소(도로명 + 건물번호)가 같은 상가
 * - 못 찾으면 name 은 건물명 또는 null (주소만 표시)
 * @param {{ tapMeters?: number }} options 화면에서 손가락이 닿는 범위를 미터로 바꾼 값 (줌에 따라 다름)
 * @returns {Promise<{name: string|null, category: string, address: string|null, lat: number, lng: number}>}
 */
export async function describeLocation(lat, lng, { tapMeters = 30 } = {}) {
  // 누른 곳 + 손가락 범위 가장자리 4곳의 주소를 본다. 라벨 근처를 누르면 옆 필지·옆 도로가 나와서
  // 그 도로로만 검색하면 정작 라벨의 상가가 결과에 없기 때문
  const [result, ...around] = await Promise.all(
    [[0, 0], ...TAP_SAMPLE_DIRECTIONS].map(([dy, dx]) => {
      const [sLat, sLng] = offsetMeters(lat, lng, dy * tapMeters * 0.7, dx * tapMeters * 0.7)
      return reverseGeocodeResult(sLat, sLng).catch(() => null)
    })
  )
  const address = formatAddress(result)
  const area = result?.region?.area3?.name ?? ''
  const building = result?.land?.addition0?.value?.trim()
  const road = result?.name === 'roadaddr' ? result?.land?.name : null
  const roadNumber = [result?.land?.number1, result?.land?.number2].filter(v => v && v !== '0').join('-')

  const samples = [result, ...around].filter(Boolean)
  const buildings = unique(samples.map(r => r.land?.addition0?.value?.trim())).slice(0, MAX_SAMPLE_NAMES)
  const roads = unique(samples.map(r => (r.name === 'roadaddr' ? r.land?.name : null))).slice(0, MAX_SAMPLE_NAMES)
  const queries = [
    ...buildings.map(b => `${area} ${b}`),
    ...roads.flatMap(r => ROAD_SEARCH_WORDS.map(word => `${area} ${r} ${word}`)),
  ]
  const places = await searchAll(queries)

  const sameAddress = place => isSameRoadAddress(place.address, road, roadNumber)
  const ofBuilding = place => Boolean(building) && place.name.startsWith(building)
  const within = meters => list => pickNearest(list, lat, lng, meters)
  const tap = within(tapMeters)
  const nearBuilding = within(BUILDING_NEARBY_METERS)

  const found =
    tap(places.filter(ofBuilding)) ??
    tap(places.filter(sameAddress)) ??
    tap(places) ??
    nearBuilding(places.filter(ofBuilding)) ??
    (building ? nearBuilding(places.filter(p => p.name.includes(building))) : null) ??
    within(SAME_ADDRESS_METERS)(places.filter(sameAddress))

  if (!found) return { name: building || null, category: '', address, lat, lng }

  return {
    name: found.name,
    category: found.category || '',
    address: found.address || address,
    lat: found.lat,
    lng: found.lng,
  }
}

// 주변 주소를 볼 방향 (북·동·남·서) 과, 검색어로 쓸 건물명·도로명 최대 개수 (API 호출 수 제한)
const TAP_SAMPLE_DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const MAX_SAMPLE_NAMES = 3

const unique = values => [...new Set(values.filter(Boolean))]

/** (lat, lng)에서 북쪽 dy 미터, 동쪽 dx 미터 떨어진 좌표 */
function offsetMeters(lat, lng, dy, dx) {
  return [lat + dy / 111_320, lng + dx / (111_320 * Math.cos((lat * Math.PI) / 180))]
}

/** 여러 검색어 결과를 한 목록으로 (실패한 검색은 빈 결과로 친다) */
async function searchAll(queries) {
  const lists = await Promise.all(queries.map(q => searchPlaces(q.trim()).catch(() => [])))
  return lists.flat()
}

/** "… 봉산2길 76-1 1층" 이 도로명 + 건물번호와 같은지 (76-1 과 76-10 은 다르게 본다) */
export function isSameRoadAddress(placeAddress, road, roadNumber) {
  if (!placeAddress || !road || !roadNumber) return false
  const target = `${road} ${roadNumber}`
  const at = placeAddress.indexOf(target)
  if (at === -1) return false
  const prev = placeAddress[at - 1]
  const next = placeAddress[at + target.length]
  // 앞뒤 경계 확인: "신봉산2길" 이나 "76-10" 은 다른 주소
  return (prev === undefined || prev === ' ') && (next === undefined || !/[\d-]/.test(next))
}

/** 좌표가 있는 결과 중 (lat, lng)에서 maxMeters 안에 있는 가장 가까운 것 */
export function pickNearest(places, lat, lng, maxMeters) {
  let best = null
  let bestDistance = Infinity
  for (const place of places) {
    if (place.lat == null || place.lng == null) continue
    const d = distanceMeters(lat, lng, place.lat, place.lng)
    if (d <= maxMeters && d < bestDistance) {
      best = place
      bestDistance = d
    }
  }
  return best
}

// 수백 m 범위라 평면 근사로 충분하다
function distanceMeters(lat1, lng1, lat2, lng2) {
  const dy = (lat2 - lat1) * 111_320
  const dx = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

/** reverseGeocode 의 첫 결과(도로명 우선)를 그대로 돌려준다 */
async function reverseGeocodeResult(lat, lng) {
  const maps = await loadNaverMaps()

  return new Promise((resolve, reject) => {
    maps.Service.reverseGeocode(
      // 옵션 이름은 coords 다. location 으로 넘기면 orders 가 무시되고 주소 없는 countrycode 결과가 먼저 온다
      { coords: new maps.LatLng(lat, lng), orders: 'roadaddr,addr' },
      (status, response) => {
        if (status === maps.Service.Status.ERROR) {
          reject(new Error('주소를 확인하지 못했습니다.'))
          return
        }
        if (status !== maps.Service.Status.OK) {
          resolve(null)
          return
        }
        resolve(response?.v2?.results?.[0] ?? null)
      }
    )
  })
}

/**
 * reverseGeocode 응답을 "서울 마포구 어울마당로 35" 형태로 조립한다.
 * - 도로명 결과면 land.name(도로명) + 건물번호를 붙인다.
 * - 지번 결과면 지역명만 이어 붙인다.
 */
function formatAddress(result) {
  if (!result) return null

  const { region, land } = result
  const area = [region?.area1?.name, region?.area2?.name, region?.area3?.name, region?.area4?.name]
    .filter(Boolean)
    .join(' ')

  if (!land?.name) return area || null

  const number = [land.number1, land.number2]
    .filter(value => value && value !== '0')
    .join('-')

  return `${area} ${land.name}${number ? ` ${number}` : ''}`.trim()
}
