/**
 * PinMate 로컬 스토리지 & 상태 관리 유틸리티
 * 백엔드 서버 없이도 브라우저에서 실제 데이터 추가/수정/삭제 및 추천이 영구 유지되도록 지원합니다.
 */
import { MOCK_TEAMS, MOCK_PINS, CURRENT_USER, MOCK_MEMBERS } from '../data/mockData'

const STORAGE_KEYS = {
  TEAMS: 'pinmate_teams',
  PINS: 'pinmate_pins',
  USER: 'pinmate_user',
}

// 초기 데이터 로드 (LocalStorage에 없으면 기본 mockData로 초기화)
export function getStoredTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEAMS)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('로컬스토리지 팀 목록 로드 실패:', e)
  }
  // 기본값 설정
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(MOCK_TEAMS))
  return MOCK_TEAMS
}

export function saveStoredTeams(teams) {
  try {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams))
  } catch (e) {
    console.error('로컬스토리지 팀 목록 저장 실패:', e)
  }
}

export function getStoredPins() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PINS)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('로컬스토리지 핀 목록 로드 실패:', e)
  }
  // 기본값 설정
  localStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(MOCK_PINS))
  return MOCK_PINS
}

export function saveStoredPins(pins) {
  try {
    localStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(pins))
  } catch (e) {
    console.error('로컬스토리지 핀 목록 저장 실패:', e)
  }
}

/**
 * 새 팀 생성
 */
export function createTeam(name, members = MOCK_MEMBERS) {
  const teams = getStoredTeams()
  const newTeam = {
    id: `team-${Date.now()}`,
    name,
    memberCount: members.length,
    pinCount: 0,
    myBadge: null,
    createdAt: new Date().toISOString().split('T')[0],
    members: members,
  }
  const updated = [newTeam, ...teams]
  saveStoredTeams(updated)
  return newTeam
}

/**
 * 핀 추가
 */
export function addPin(pinData) {
  const pins = getStoredPins()
  const newPin = {
    ...pinData,
    id: pinData.id || `pin-${Date.now()}`,
    addedAt: new Date().toISOString(),
  }
  const updated = [newPin, ...pins]
  saveStoredPins(updated)

  // 팀의 핀 개수도 업데이트
  const teams = getStoredTeams()
  const teamIdx = teams.findIndex(t => t.id === newPin.teamId)
  if (teamIdx >= 0) {
    teams[teamIdx].pinCount = (teams[teamIdx].pinCount || 0) + 1
    saveStoredTeams(teams)
  }

  return newPin
}

/**
 * 장소 추천 토글 (추천하기 / 추천 취소)
 * - 팀원 전원이 추천하면 isAllApproved가 true가 됨
 */
export function togglePinRecommendation(pinId, userId = CURRENT_USER.id, teamMemberCount = 3) {
  const pins = getStoredPins()
  let updatedPin = null
  let reachedAllApproved = false

  const updatedPins = pins.map(p => {
    if (p.id !== pinId) return p

    const alreadyRecommended = p.recommenders.includes(userId)
    const newRecommenders = alreadyRecommended
      ? p.recommenders.filter(id => id !== userId)
      : [...p.recommenders, userId]

    // 팀원 수가 2명 이상이고 전원이 추천했을 때 '모두 인정' 달성
    const isAllApproved = teamMemberCount >= 2 && newRecommenders.length >= teamMemberCount

    if (isAllApproved && !p.isAllApproved) {
      reachedAllApproved = true
    }

    updatedPin = {
      ...p,
      recommenders: newRecommenders,
      isAllApproved,
      allApprovedAt: isAllApproved ? (p.allApprovedAt || new Date().toISOString()) : null,
    }
    return updatedPin
  })

  saveStoredPins(updatedPins)
  return { updatedPin, updatedPins, reachedAllApproved }
}

/**
 * 장소 방문 여부 토글
 */
export function togglePinVisit(pinId, userId = CURRENT_USER.id) {
  const pins = getStoredPins()
  let updatedPin = null

  const updatedPins = pins.map(p => {
    if (p.id !== pinId) return p
    const visited = p.visitedBy || []
    const alreadyVisited = visited.includes(userId)
    const newVisited = alreadyVisited
      ? visited.filter(id => id !== userId)
      : [...visited, userId]

    updatedPin = {
      ...p,
      visitedBy: newVisited,
    }
    return updatedPin
  })

  saveStoredPins(updatedPins)
  return { updatedPin, updatedPins }
}
