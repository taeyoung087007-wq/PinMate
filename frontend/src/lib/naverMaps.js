/**
 * NAVER 지도 JavaScript API v3 로더
 * - index.html에 스크립트를 박지 않고 필요할 때 한 번만 동적으로 불러온다
 *   (키가 없거나 인증에 실패해도 앱 전체가 죽지 않고, 지도 영역에서만 안내를 보여주기 위함)
 * - Client ID는 클라이언트에 노출되는 값이라 VITE_ 환경변수로 둔다.
 *   실제 방어선은 NCP 콘솔에 등록한 도메인 제한이다.
 */
const SDK_ID = 'naver-maps-sdk'
const SDK_URL = 'https://oapi.map.naver.com/openapi/v3/maps.js'

// 같은 스크립트를 여러 번 불러오지 않도록 Promise를 재사용한다
let sdkPromise = null

// 인증 실패는 스크립트 로드가 끝난 뒤(지도 생성·타일 요청 시점)에 발생할 수 있다.
// 그때는 이미 resolve된 Promise라 reject가 먹히지 않으므로 구독자를 따로 둔다.
const authFailureListeners = new Set()

const AUTH_FAILURE_MESSAGE =
  '네이버 지도 인증에 실패했습니다. NCP 콘솔의 Client ID와 등록 도메인(http://localhost:5173)을 확인하세요.'

/** 실패 원인을 호출부에서 구분할 수 있도록 code를 붙인 Error를 만든다 */
function sdkError(message, code) {
  return Object.assign(new Error(message), { code })
}

/**
 * 지도 인증 실패를 구독한다.
 * @param {(error: Error) => void} listener
 * @returns {() => void} 구독 해제
 */
export function onNaverMapAuthFailure(listener) {
  authFailureListeners.add(listener)
  return () => authFailureListeners.delete(listener)
}


/**
 * @returns {Promise<object>} window.naver.maps
 */
export function loadNaverMaps() {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps)

  const keyId = import.meta.env.VITE_NAVER_MAP_KEY?.trim()
  if (!keyId) {
    return Promise.reject(
      sdkError('VITE_NAVER_MAP_KEY가 없습니다. frontend/.env에 Client ID를 넣고 개발 서버를 다시 시작하세요.', 'NO_KEY')
    )
  }

  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    // 인증 실패는 script.onerror로 오지 않고 이 전역 콜백으로만 알려준다
    window.navermap_authFailure = () => {
      const error = sdkError(AUTH_FAILURE_MESSAGE, 'AUTH')
      // ① 아직 로드 중이면 로더를 실패시킨다
      reject(error)
      // ② 이미 로드가 끝났으면 지도를 쓰던 컴포넌트에 알린다
      authFailureListeners.forEach(listener => listener(error))
    }

    // HMR 등으로 스크립트만 남아 있고 전역 객체가 없는 경우를 정리
    document.getElementById(SDK_ID)?.remove()

    const script = document.createElement('script')
    script.id = SDK_ID
    script.async = true
    // geocoder 서브모듈을 함께 받아야 주소↔좌표 변환(Service.geocode)을 쓸 수 있다.
    // 서브모듈도 Client ID만으로 동작하므로 Client Secret 없이 브라우저에서 호출할 수 있다.
    script.src = `${SDK_URL}?ncpKeyId=${encodeURIComponent(keyId)}&submodules=geocoder`
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps)
      else reject(sdkError('지도 스크립트는 로드됐지만 naver.maps를 찾을 수 없습니다.', 'LOAD'))
    }
    script.onerror = () => reject(sdkError('네이버 지도 스크립트를 불러오지 못했습니다. 네트워크를 확인하세요.', 'NETWORK'))
    document.head.appendChild(script)
  }).catch(error => {
    // 실패는 캐시하지 않는다 (키를 고친 뒤 다시 시도할 수 있게)
    sdkPromise = null
    throw error
  })

  return sdkPromise
}
