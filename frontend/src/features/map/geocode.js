import { loadKakaoMaps } from '../../lib/kakaoMaps'
import { findNearestPlace } from './places'

/**
 * 주소·장소명으로 좌표를 찾는다 (Geocoding)
 * - 카카오 지도 SDK의 services 라이브러리를 쓴다 (JavaScript 키만으로 동작)
 * - REST API(/v2/local/search/address)를 쓰려면 REST 키가 필요한데, 브라우저에 노출할 수 없다
 * @param {string} query 예: "성수동 대림창고", "서울 마포구 어울마당로 35"
 * @returns {Promise<Array<{name: string, address: string, lat: number, lng: number}>>}
 */
export async function geocode(query) {
  const maps = await loadKakaoMaps()

  return new Promise((resolve, reject) => {
    new maps.services.Geocoder().addressSearch(query, (result, status) => {
      if (status === maps.services.Status.ERROR) {
        reject(new Error('주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
        return
      }
      if (status !== maps.services.Status.OK) {
        resolve([])
        return
      }

      resolve(
        (result ?? []).map(item => ({
          // 도로명 주소가 있으면 그걸 이름처럼 쓰고, 없으면 지번
          name: item.road_address?.address_name || item.address?.address_name || query,
          address: item.road_address?.address_name || item.address?.address_name || '',
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
 * 1) 역지오코딩으로 주소·건물명을 얻고
 * 2) 카카오 Places 로 누른 곳 반경(tapMeters) 안의 가장 가까운 상가를 찾는다
 *
 * @param {{ tapMeters?: number }} options 손가락이 닿는 범위(미터). 줌에 따라 호출부가 계산해 넘긴다
 * @returns {Promise<{name: string|null, category: string, address: string|null, lat: number, lng: number}>}
 */
export async function describeLocation(lat, lng, { tapMeters = 30 } = {}) {
  const result = await reverseGeocodeResult(lat, lng).catch(() => null)
  const address = formatAddress(result)
  const building = result?.road_address?.building_name?.trim() ?? ''

  const found = await findNearestPlace(lat, lng, tapMeters, { building }).catch(() => null)
  // 상가를 찾으면 그 좌표로 옮겨 찍는다 (못 찾으면 누른 자리 그대로)
  if (found) return { ...found, address: found.address || address }

  return { name: building || null, category: '', address, lat, lng }
}

/**
 * 좌표 → 주소 결과의 첫 항목을 돌려준다.
 * 카카오 Geocoder 는 (경도, 위도) 순서를 받는다.
 */
async function reverseGeocodeResult(lat, lng) {
  const maps = await loadKakaoMaps()

  return new Promise((resolve, reject) => {
    new maps.services.Geocoder().coord2Address(lng, lat, (result, status) => {
      if (status === maps.services.Status.ERROR) {
        reject(new Error('주소를 확인하지 못했습니다.'))
        return
      }
      if (status !== maps.services.Status.OK || !result?.length) {
        resolve(null)
        return
      }
      resolve(result[0])
    })
  })
}

/**
 * 좌표 → 주소 응답을 "서울 마포구 어울마당로 35" 형태로 조립한다.
 * - 도로명 주소가 있으면 그걸 그대로 쓴다 (카카오가 이미 완성된 문자열을 준다)
 * - 없으면 지번 주소로 대체한다
 */
function formatAddress(result) {
  if (!result) return null
  return result.road_address?.address_name || result.address?.address_name || null
}
