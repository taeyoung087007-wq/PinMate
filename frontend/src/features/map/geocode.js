import { loadNaverMaps } from '../../lib/naverMaps'

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
  const maps = await loadNaverMaps()

  return new Promise((resolve, reject) => {
    maps.Service.reverseGeocode(
      { location: new maps.LatLng(lat, lng), orders: 'roadaddr,addr' },
      (status, response) => {
        if (status === maps.Service.Status.ERROR) {
          reject(new Error('주소를 확인하지 못했습니다.'))
          return
        }
        if (status !== maps.Service.Status.OK) {
          resolve(null)
          return
        }
        resolve(formatAddress(response?.v2?.results?.[0]))
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
