/**
 * 공용 API 클라이언트 (fetch 래퍼)
 * - 개발: Vite 프록시가 /api 요청을 Spring Boot(localhost:8080)로 전달
 * - 배포: VITE_API_URL 로 API 주소 지정
 * - 응답은 {code, message, data}. code 가 SUCCESS 가 아니면 request()가 에러를 던진다
 * - 기능별 API 함수는 features/<기능>/api.js 에 둔다
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 결과 코드. 백엔드 Constants.java 와 같은 값을 유지한다
export const CODE = {
  SUCCESS: '00',
  FAIL: '99',
  LOGIN_FAIL: '01',
  LOGIN_BLOCKED: '03',
  SIGNUP_FAIL_CODE: '11',
  SIGNUP_FAIL_EXISTS: '12',
  SIGNUP_BLOCKED: '13',
  SIGNUP_FAIL_NICKNAME: '14',
  INVITE_FAIL: '21',
  INVITE_BLOCKED: '23',
  INVALID: '90',
  NOT_FOUND: '91',
}

/** 응답 본문 {code, message, data}를 그대로 돌려준다. 세션이 만료됐으면 로그인 화면으로 보낸다 */
export async function send(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // 서버는 이 헤더와 JSON 본문이 없는 POST 를 거절한다 (다른 사이트의 폼 전송 차단)
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...options.headers },
  })
  const json = await res.json().catch(() => null)
  if (json?.sessionExpired) {
    localStorage.removeItem('pinmate_logged_in')
    localStorage.removeItem('pinmate_user')
    const query = window.location.pathname === '/login' ? window.location.search : ''
    window.location.replace(`/login${query}`)
    throw new Error('로그인이 필요합니다.')
  }
  if (!json) {
    throw new Error(`API 요청 실패 (${res.status})`)
  }
  return json
}

export async function request(path, options = {}) {
  const json = await send(path, options)
  if (json.code !== CODE.SUCCESS) {
    throw new Error(json.message || `API 요청 실패 (${json.code})`)
  }
  return json.data
}

export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
