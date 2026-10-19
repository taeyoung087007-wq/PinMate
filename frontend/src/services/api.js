/**
 * PinMate API 클라이언트 서비스 레이어
 * - 백엔드 서버(포트 4000)가 기동 중이면 실제 REST API를 호출
 * - 백엔드 서버가 미기동 상태이거나 네트워크 에러 시 storage.js(LocalStorage)로 자동 폴백
 * - 개발자 3명이 독립적으로 프론트/백 작업을 병행할 수 있도록 지원합니다.
 */
import * as localStore from './storage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// 서버 연결 가능 여부 캐시
let isServerOnline = null

async function checkServerStatus() {
  if (isServerOnline !== null) return isServerOnline
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal })
    clearTimeout(timer)
    isServerOnline = res.ok
  } catch (e) {
    isServerOnline = false
  }
  return isServerOnline
}

/**
 * 팀 목록 가져오기
 */
export async function fetchTeams() {
  const online = await checkServerStatus()
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/teams`)
      const json = await res.json()
      if (json.success && json.data) return json.data
    } catch (e) {
      console.warn('API 호출 실패, 로컬 스토리지로 전환:', e)
    }
  }
  return localStore.getStoredTeams()
}

/**
 * 새 팀 생성하기
 */
export async function createTeamApi(name) {
  const online = await checkServerStatus()
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (json.success && json.data) return json.data
    } catch (e) {
      console.warn('팀 생성 API 실패, 로컬 스토리지로 저장:', e)
    }
  }
  return localStore.createTeam(name)
}

/**
 * 핀 목록 가져오기
 */
export async function fetchPins(teamId) {
  const online = await checkServerStatus()
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/pins?teamId=${encodeURIComponent(teamId)}`)
      const json = await res.json()
      if (json.success && json.data) return json.data
    } catch (e) {
      console.warn('핀 조회 API 실패, 로컬 스토리지로 전환:', e)
    }
  }
  return localStore.getStoredPins().filter(p => p.teamId === teamId)
}

/**
 * 새 핀 등록하기
 */
export async function createPinApi(pinData) {
  const online = await checkServerStatus()
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pinData),
      })
      const json = await res.json()
      if (json.success && json.data) return json.data
    } catch (e) {
      console.warn('핀 등록 API 실패, 로컬 스토리지로 저장:', e)
    }
  }
  return localStore.addPin(pinData)
}

/**
 * 핀 추천 토글
 */
export async function toggleRecommendationApi(pinId, userId, teamMemberCount) {
  const online = await checkServerStatus()
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/pins/${pinId}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        return {
          updatedPin: json.data,
          reachedAllApproved: json.data.isAllApproved,
        }
      }
    } catch (e) {
      console.warn('추천 API 실패, 로컬 스토리지로 처리:', e)
    }
  }
  return localStore.togglePinRecommendation(pinId, userId, teamMemberCount)
}
