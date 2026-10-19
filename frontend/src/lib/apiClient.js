/**
 * 공용 API 클라이언트 (fetch 래퍼)
 * - 개발: Vite 프록시가 /api 요청을 Spring Boot(localhost:8080)로 전달
 * - 배포: VITE_API_URL 로 API 주소 지정
 * - 실패 시 에러를 던진다. 기능별 API 함수는 features/<기능>/api.js 에 둔다
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `API 요청 실패 (${res.status})`)
  }
  return json.data
}

export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
