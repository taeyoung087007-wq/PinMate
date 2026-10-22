import { loadNaverMaps } from '../../lib/naverMaps'
import { searchNearby } from './api'

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

/**
 * 지도에서 누른 좌표의 주소와 상가 이름을 구한다.
 *
 * 브라우저 요청은 2회다.
 *   1) 역지오코딩 1회 — 주소·건물명·도로명을 얻는다 (지도 SDK, Client ID만 필요)
 *   2) 주변 상가 검색 1회 — 주소 조각을 백엔드로 넘기고, 서버가 질의를 순차 시도한다
 *
 * 이전에는 역지오코딩 5회 + 상호 검색 최대 12회를 동시에 쐈다.
 * 검색을 서버로 모으고 순차로 바꾸면서 요청 수와 업스트림 호출이 모두 줄었다.
 *
 * @param {{ tapMeters?: number }} options 손가락이 닿는 범위(미터). 줌에 따라 호출부가 계산해 넘긴다
 * @returns {Promise<{name: string|null, category: string, address: string|null, lat: number, lng: number}>}
 */
export async function describeLocation(lat, lng, { tapMeters = 30 } = {}) {
  const result = await reverseGeocodeResult(lat, lng).catch(() => null)
  const address = formatAddress(result)

  const building = result?.land?.addition0?.value?.trim() ?? ''
  const road = result?.name === 'roadaddr' ? (result?.land?.name ?? '') : ''
  const roadNumber = [result?.land?.number1, result?.land?.number2]
    .filter(value => value && value !== '0')
    .join('-')

  try {
    const found = await searchNearby({
      lat,
      lng,
      tapMeters,
      area: result?.region?.area3?.name ?? '',
      building,
      road,
      roadNumber,
    })
    // 상가를 찾으면 그 좌표로 옮겨 찍는다 (못 찾으면 누른 자리 그대로)
    if (found?.lat != null && found?.lng != null) {
      return { ...found, address: found.address || address }
    }
  } catch {
    // 백엔드가 없거나 검색 키가 없으면 주소만 보여준다
  }

  return { name: building || null, category: '', address, lat, lng }
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
