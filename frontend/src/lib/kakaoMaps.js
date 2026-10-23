/**
 * 카카오 지도 JavaScript SDK 로더
 * - index.html에 스크립트를 박지 않고 필요할 때 한 번만 동적으로 불러온다
 *   (키가 없거나 인증에 실패해도 앱 전체가 죽지 않고, 지도 영역에서만 안내를 보여주기 위함)
 * - JavaScript 키는 클라이언트에 노출되는 값이라 VITE_ 환경변수로 둔다.
 *   실제 방어선은 카카오 콘솔에 등록한 JavaScript SDK 도메인이다.
 * - REST API 키가 아니라 **JavaScript 키**를 써야 한다 (섞으면 지도가 뜨지 않는다)
 */
const SDK_ID = 'kakao-maps-sdk'
const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js'

// 같은 스크립트를 여러 번 불러오지 않도록 Promise를 재사용한다
let sdkPromise = null

const AUTH_FAILURE_MESSAGE =
  '카카오 지도 인증에 실패했습니다. 카카오 콘솔의 JavaScript 키와 등록 도메인(http://localhost:5173)을 확인하세요.'

/** 실패 원인을 호출부에서 구분할 수 있도록 code를 붙인 Error를 만든다 */
function sdkError(message, code) {
  return Object.assign(new Error(message), { code })
}

/**
 * @returns {Promise<object>} window.kakao.maps
 */
export function loadKakaoMaps() {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY?.trim()
  if (!appKey) {
    return Promise.reject(
      sdkError(
        'VITE_KAKAO_MAP_KEY가 없습니다. frontend/.env에 JavaScript 키를 넣고 개발 서버를 다시 시작하세요.',
        'NO_KEY'
      )
    )
  }

  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    // HMR 등으로 스크립트만 남아 있고 전역 객체가 없는 경우를 정리
    document.getElementById(SDK_ID)?.remove()

    const script = document.createElement('script')
    script.id = SDK_ID
    script.async = true
    // autoload=false 로 두고 kakao.maps.load 콜백에서 "준비 완료"를 받는다.
    // libraries=services 는 주소↔좌표 변환(Geocoder)과 장소 검색(Places)에 필요하다.
    script.src =
      `${SDK_URL}?appkey=${encodeURIComponent(appKey)}` +
      '&libraries=services&autoload=false'
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(sdkError('지도 스크립트는 로드됐지만 kakao.maps를 찾을 수 없습니다.', 'LOAD'))
        return
      }
      window.kakao.maps.load(() => {
        if (window.kakao.maps.Map) resolve(window.kakao.maps)
        else reject(sdkError(AUTH_FAILURE_MESSAGE, 'AUTH'))
      })
    }
    script.onerror = () =>
      reject(sdkError('카카오 지도 스크립트를 불러오지 못했습니다. 네트워크를 확인하세요.', 'NETWORK'))
    document.head.appendChild(script)
  }).catch(error => {
    // 실패는 캐시하지 않는다 (키를 고친 뒤 다시 시도할 수 있게)
    sdkPromise = null
    throw error
  })

  return sdkPromise
}
