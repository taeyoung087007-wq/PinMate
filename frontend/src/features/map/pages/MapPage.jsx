import { useState, useMemo, useEffect, useRef } from 'react'
import {
  MapPin, Star, Users,
  ChevronDown, X, Sparkles
} from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { SORTS } from '../placeList'
import { getCurrentUser, setCurrentUserStorage } from '../../../lib/currentUser'
import {
  fetchTeam,
  fetchPins,
  createPinApi,
  toggleRecommendationApi,
  updatePinApi,
  deletePinApi
} from '../api'
import { fetchTeams, createTeamApi, joinTeamApi } from '../../teams/api'
import { distanceMeters } from '../places'
import MapCanvas from '../components/MapCanvas'
import ErrorBoundary from '../../../components/ErrorBoundary/ErrorBoundary'
import TopSearch from '../components/TopSearch'
import PinDetailPanel from '../components/PinDetailPanel'
import AddPinModal from '../components/AddPinModal'
import PlaceListPanel from '../components/PlaceListPanel'
import CelebrationModal from '../components/CelebrationModal'
import BottomNav from '../../../components/BottomNav/BottomNav'
import TeamDrawer from '../../teams/components/TeamDrawer'
import TeamCreateModal from '../../teams/components/TeamCreateModal'
import SettingsPage from '../../auth/pages/SettingsPage'
import styles from './MapPage.module.css'

/** 카테고리 필터 목록 */
const CATEGORIES = ['all', 'food', 'cafe', 'drink', 'stay', 'sight', 'play', 'etc']

/**
 * 네이버지도/카카오맵 스타일 메인 지도 앱 페이지
 * - 전체 화면 캔버스 지도 메인
 * - 상단 플로팅 바 (모임 전환 드롭다운 + 검색창 + 카테고리/팀원 칩)
 * - 가로 스크롤 모임·카테고리·팀원 칩과 장소 목록 정렬
 * - 하단 고정 내비게이션 바 (지도, 모임, 장소 목록, 설정)
 */
export default function MapPage({ initialTeamId, onLogout, onWithdrawn }) {
  // 사용자 상태 (설정에서 프로필을 바꾸면 저장소와 함께 갱신)
  const [currentUser, setCurrentUser] = useState(getCurrentUser)

  // 모임 목록 상태
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || null)
  const [teamDetail, setTeamDetail] = useState(null)
  const members = teamDetail?.members ?? []

  // 프로필을 저장하면 모임 목록·상세의 내 멤버 정보도 새로고침 없이 바꾼다 (팀 색은 그대로)
  const updateCurrentUser = user => {
    setCurrentUserStorage(user)
    setCurrentUser(user)
    const { nickname, initials, avatarId, avatarBg } = user
    const patchMembers = team => team && {
      ...team,
      members: team.members?.map(m => m.id === user.loginId ? { ...m, nickname, initials, avatarId, avatarBg } : m),
    }
    setTeams(prev => prev.map(patchMembers))
    setTeamDetail(patchMembers)
  }

  // 핀 상태
  const [pins, setPins] = useState([])
  const [pinLoadState, setPinLoadState] = useState({ teamId: null, status: 'loading' })
  const [selectedPin, setSelectedPin] = useState(null)
  const [error, setError] = useState('')

  // UI 제어 상태
  const [activeTab, setActiveTab] = useState('map')
  const [showTeamDrawer, setShowTeamDrawer] = useState(false)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showAddPinModal, setShowAddPinModal] = useState(false)
  const [pickedPlace, setPickedPlace] = useState(null) // 메인 지도에서 고른 위치로 장소 추가할 때
  const [routeTarget, setRouteTarget] = useState(null) // 길찾기 도착지 핀
  // 패널을 닫아도 경로선은 남긴다 — 핀 상세를 보면서 경로를 참고할 수 있게
  const [routePanelOpen, setRoutePanelOpen] = useState(false)
  const [showListPanel, setShowListPanel] = useState(false)
  const [placeSort, setPlaceSort] = useState('recommend')
  const [celebrationPin, setCelebrationPin] = useState(null)

  // 필터 상태
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeMember, setActiveMember] = useState('all')
  const [showOnlyApproved, setShowOnlyApproved] = useState(false)
  const [focusPlace, setFocusPlace] = useState(null) // 상단 검색에서 고른 장소 (지도에 말풍선)
  const chipsRef = useDragScroll()

  // 1. 내 모임 목록 로드
  useEffect(() => {
    fetchTeams(currentUser.id)
      .then(fetchedTeams => {
        setTeams(fetchedTeams)
        if (fetchedTeams.length > 0) {
          // 이미 선택된 ID가 유효하면 유지, 없으면 첫 번째 팀 선택
          const hasValid = fetchedTeams.some(t => String(t.id) === String(selectedTeamId))
          if (!hasValid) {
            setSelectedTeamId(fetchedTeams[0].id)
          }
        }
      })
      .catch(e => setError(`모임 목록을 불러오지 못했습니다: ${e.message}`))
  }, [currentUser.id])

  // 2. 선택된 모임의 상세 정보 및 핀 목록 로드
  useEffect(() => {
    if (!selectedTeamId) return
    let cancelled = false
    Promise.all([fetchTeam(selectedTeamId), fetchPins(selectedTeamId)])
      .then(([tData, pData]) => {
        if (cancelled) return
        setPinLoadState({ teamId: selectedTeamId, status: 'ready' })
        setTeamDetail(tData)
        setPins(pData)
        setSelectedPin(null) // 모임 변경 시 선택 핀 해제
      })
      .catch(e => {
        if (cancelled) return
        setPinLoadState({ teamId: selectedTeamId, status: 'error' })
        setError(`지도 데이터를 불러오지 못했습니다: ${e.message}`)
      })
    return () => { cancelled = true }
  }, [selectedTeamId])

  // 필터링된 핀 목록
  const filteredPins = useMemo(() => {
    return pins.filter(pin => {
      if (activeCategory !== 'all' && pin.category !== activeCategory) return false
      if (activeMember !== 'all' && !pin.recommenders.includes(activeMember)) return false
      if (showOnlyApproved && !pin.isAllApproved) return false
      return true
    })
  }, [pins, activeCategory, activeMember, showOnlyApproved])

  // 현재 모임 정보
  const currentTeam = teams.find(t => String(t.id) === String(selectedTeamId)) || teamDetail
  const allApprovedCount = pins.filter(p => p.isAllApproved).length

  const selectTeam = teamId => {
    setSelectedTeamId(teamId)
    setActiveMember('all')
    setSelectedPin(null)
  }

  const closePlaceList = () => {
    setShowListPanel(false)
    setActiveTab(tab => tab === 'places' ? 'map' : tab)
  }

  // 새 모임 생성 완료 핸들러
  const handleCreateTeam = async (name) => {
    const newTeam = await createTeamApi(name, currentUser.id)
    setTeams(prev => [newTeam, ...prev])
    setSelectedTeamId(newTeam.id)
    setShowTeamDrawer(false)
    return newTeam
  }

  // 초대 코드로 모임 참여 (이미 멤버여도 같은 팀이 돌아온다)
  const handleJoinTeam = async (code) => {
    const team = await joinTeamApi(code, currentUser.id)
    setTeams(prev => [team, ...prev.filter(t => String(t.id) !== String(team.id))])
    setSelectedTeamId(team.id)
    setActiveTab('map')
    return team
  }

  // 핀 추가 핸들러. 이미 있는 장소면 새로 만들지 않고 그 장소를 보여준다 (서버도 한 번 더 막는다)
  const handleAddPin = async (newPinData) => {
    const same = pins.find(p => isSamePlace(p, newPinData))
    if (same) {
      setShowAddPinModal(false)
      setSelectedPin(same)
      setError(`'${same.name}'은(는) 이미 이 모임에 등록된 장소예요.`)
      return
    }
    try {
      const saved = await createPinApi(newPinData)
      setPins(prev => [saved, ...prev])
      setShowAddPinModal(false)
      setSelectedPin(saved)
    } catch (e) {
      setError(`장소 추가에 실패했습니다: ${e.message}`)
    }
  }

  // 추천 토글 핸들러
  const handleRecommend = async (pinId) => {
    try {
      const { pin, reachedAllApproved } = await toggleRecommendationApi(pinId, currentUser.id)
      setPins(prev => prev.map(p => p.id === pin.id ? pin : p))
      setSelectedPin(pin)
      if (reachedAllApproved) {
        setCelebrationPin(pin)
      }
    } catch (e) {
      setError(`추천 처리에 실패했습니다: ${e.message}`)
    }
  }

  // 모임을 나가거나 삭제한 뒤: 목록에서 빼고, 보고 있던 모임이면 다른 모임(없으면 빈 지도)으로
  const handleLeftTeam = (teamId) => {
    const rest = teams.filter(t => String(t.id) !== String(teamId))
    setTeams(rest)
    if (String(selectedTeamId) !== String(teamId)) return
    setSelectedTeamId(rest[0]?.id ?? null)
    if (rest.length === 0) {
      setTeamDetail(null)
      setPins([])
      setSelectedPin(null)
    }
  }

  // 장소 수정 핸들러 (성공 여부를 돌려줘 패널이 수정 모드를 닫을 수 있게 한다)
  const handleUpdatePin = async (pinId, data) => {
    try {
      const updated = await updatePinApi(pinId, data)
      setPins(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      setSelectedPin(updated)
      return true
    } catch (e) {
      setError(`장소 수정에 실패했습니다: ${e.message}`)
      return false
    }
  }

  // 장소 삭제 핸들러
  const handleDeletePin = async (pinId) => {
    try {
      await deletePinApi(pinId)
      setPins(prev => prev.filter(p => p.id !== pinId))
      setSelectedPin(null)
    } catch (e) {
      setError(`장소 삭제에 실패했습니다: ${e.message}`)
    }
  }

  // 하단 탭 변경 핸들러
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'map') {
      setShowTeamDrawer(false)
      setShowListPanel(false)
    } else if (tabId === 'teams') {
      setShowListPanel(false)
      setShowTeamDrawer(true)
    } else if (tabId === 'places') {
      setShowTeamDrawer(false)
      setShowListPanel(true)
    } else if (tabId === 'settings') {
      setShowTeamDrawer(false)
      setShowListPanel(false)
      setSelectedPin(null)
    }
  }

  return (
    <div className={styles.appRoot}>
      <div inert={activeTab === 'settings'} aria-hidden={activeTab === 'settings'} style={{ visibility: activeTab === 'settings' ? 'hidden' : undefined }}>
      {/* 1. 전체 화면 메인 지도 */}
      <div className={styles.mapCanvasWrap}>
        {/* 지도에서 에러가 나도 상단바·하단 메뉴는 남긴다. 다시 시도하면 원인일 수 있는 길찾기·검색 상태를 비운다 */}
        <ErrorBoundary onReset={() => { setRouteTarget(null); setFocusPlace(null) }}>
          <MapCanvas
            pins={filteredPins}
            members={members}
            onSelectPin={setSelectedPin}
            selectedPin={selectedPin}
            onAddAtLocation={place => { setPickedPlace(place); setShowAddPinModal(true) }}
            onRouteTo={place => { setRouteTarget(place); setRoutePanelOpen(true); setSelectedPin(null); setShowListPanel(false) }}
            focusPlace={focusPlace}
            routeTarget={routeTarget}
            routePanelOpen={routePanelOpen}
            onOpenRoutePanel={() => setRoutePanelOpen(true)}
            onCloseRoutePanel={() => setRoutePanelOpen(false)}
            onClearRoute={() => { setRouteTarget(null); setRoutePanelOpen(false) }}
          />
        </ErrorBoundary>
      </div>

      {/* 2. 상단 플로팅 헤더 (팀 선택 + 검색 + 카테고리 바) */}
      <div className={styles.floatingTop}>
        <div className={styles.topCard}>
          {/* 모임 전환 버튼 */}
          <button
            className={`${styles.teamSwitchBtn} ${styles.touchArea}`}
            onClick={() => handleTabChange('teams')}
            title="모임 변경"
          >
            <span className={styles.teamBadgeDot}>📍</span>
            <span className={styles.teamTitle}>
              {currentTeam?.name || '모임 선택'}
            </span>
            <ChevronDown size={14} className={styles.teamArrow} />
          </button>

          {/* 검색: 우리 모임 장소 + 상호명·주소 */}
          <TopSearch
            pins={pins}
            onSelectPin={pin => { setSelectedPin(pin); closePlaceList() }}
            onPickPlace={place => { setSelectedPin(null); setFocusPlace({ ...place, key: Date.now() }) }}
          />

        </div>

        <div className={styles.filterBar}>
        {/* 모임·카테고리·멤버 칩은 함께 가로로 넘긴다 */}
        <div className={styles.chipsScroll} ref={chipsRef} role="group" aria-label="지도 필터">
          {teams.map(team => (
            <button
              key={team.id}
              className={`${styles.chip} ${styles.touchArea} ${String(team.id) === String(selectedTeamId) ? styles.chipActive : ''}`}
              aria-pressed={String(team.id) === String(selectedTeamId)}
              onClick={() => selectTeam(team.id)}
            >
              <Users size={12} />
              <span>{team.name}</span>
            </button>
          ))}
          {teams.length > 0 && <div className={styles.chipDivider} />}

          {/* 모두 인정 빠른 필터 */}
          <button
            className={`${styles.chip} ${styles.touchArea} ${showOnlyApproved ? styles.chipApprovedActive : ''}`}
            aria-pressed={showOnlyApproved}
            onClick={() => setShowOnlyApproved(p => !p)}
          >
            <Star size={12} fill={showOnlyApproved ? 'var(--warning)' : 'none'} color="var(--warning)" />
            <span>모두인정</span>
            <span className={styles.chipCount}>{allApprovedCount}</span>
          </button>

          <div className={styles.chipDivider} />

          {/* 카테고리 칩들 */}
          {CATEGORIES.map(cat => {
            const meta = cat === 'all' ? { label: '전체', icon: '🗺️' } : (CATEGORY_META[cat] || CATEGORY_META.etc)
            const count = cat === 'all' ? pins.length : pins.filter(p => p.category === cat).length
            const isCatActive = activeCategory === cat
            return (
              <button
                key={cat}
                className={`${styles.chip} ${styles.touchArea} ${isCatActive ? styles.chipActive : ''}`}
                aria-pressed={isCatActive}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className={styles.chipCount}>{count}</span>
              </button>
            )
          })}

          {/* 팀원 필터 칩들 */}
          {members.length > 0 && (
            <>
              <div className={styles.chipDivider} />
              {members.map(m => {
                const isMemberActive = activeMember === m.id
                return (
                  <button
                    key={m.id}
                    className={`${styles.chip} ${styles.touchArea} ${isMemberActive ? styles.chipActive : ''}`}
                    aria-pressed={isMemberActive}
                    style={isMemberActive ? { borderColor: m.avatarColor, color: m.avatarColor } : {}}
                    onClick={() => setActiveMember(p => p === m.id ? 'all' : m.id)}
                  >
                    <span className={styles.memberDot} style={{ background: m.avatarColor }} />
                    <span>{m.nickname}</span>
                  </button>
                )
              })}
            </>
          )}
        </div>
        <select
          className={styles.sortSelect}
          aria-label="장소 정렬"
          value={placeSort}
          onChange={event => setPlaceSort(event.target.value)}
        >
          {SORTS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        </div>
      </div>

      {/* 에러 알림 배너 */}
      {error && (
        <div className={styles.errorFloat}>
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.errorClose}><X size={12} /></button>
        </div>
      )}

      {/* 4. 장소 상세 정보 패널 (하단 바텀시트) */}
      {selectedPin && (
        <PinDetailPanel
          pin={selectedPin}
          members={members}
          onClose={() => setSelectedPin(null)}
          onRecommend={() => handleRecommend(selectedPin.id)}
          onUpdate={handleUpdatePin}
          onDelete={handleDeletePin}
          onRoute={pin => { setRouteTarget(pin); setRoutePanelOpen(true); setSelectedPin(null); setShowListPanel(false) }}
        />
      )}

      {/* 5. 장소 목록 패널 (사이드/바텀 드로어) */}
      {showListPanel && (
        <PlaceListPanel
          pins={filteredPins}
          members={members}
          sort={placeSort}
          onSelectPin={pin => { setSelectedPin(pin); closePlaceList() }}
          onClose={closePlaceList}
          emptyMessage={showOnlyApproved ? '모두 인정한 장소가 없습니다' : '아직 등록된 장소가 없습니다'}
        />
      )}

      {/* 6. 모임 목록 바텀시트 */}
      <TeamDrawer
        isOpen={showTeamDrawer}
        teams={teams}
        activeTeamId={selectedTeamId}
        onSelectTeam={teamId => { selectTeam(teamId); handleTabChange('map') }}
        onOpenCreate={() => { setShowTeamDrawer(false); setShowCreateTeamModal(true); }}
        onJoinTeam={handleJoinTeam}
        onLeftTeam={handleLeftTeam}
        onClose={() => { setShowTeamDrawer(false); setActiveTab('map'); }}
      />

      {/* 7. 새 모임 생성 모달 */}
      {showCreateTeamModal && (
        <TeamCreateModal
          onClose={() => setShowCreateTeamModal(false)}
          onCreateTeam={handleCreateTeam}
        />
      )}

      {/* 8. 새 장소 추가 모달 */}
      {showAddPinModal && (
        <AddPinModal
          teamId={selectedTeamId}
          initialPlace={pickedPlace}
          onClose={() => setShowAddPinModal(false)}
          onAdd={handleAddPin}
        />
      )}

      {/* 9. '모두 인정' 팡파레 축하 모달 */}
      {celebrationPin && (
        <CelebrationModal
          pin={celebrationPin}
          onClose={() => setCelebrationPin(null)}
        />
      )}

      </div>

      {activeTab === 'settings' && (
        <SettingsPage
          currentUser={currentUser}
          onLogout={onLogout}
          onUserUpdate={updateCurrentUser}
          onWithdrawn={onWithdrawn}
          places={pins.filter(pin => pin.recommenders?.includes(currentUser.loginId))}
          teamName={currentTeam?.name}
          categories={CATEGORY_META}
          placesStatus={!selectedTeamId ? (error ? 'error' : 'ready') : pinLoadState.teamId !== selectedTeamId ? 'loading' : pinLoadState.status}
          onExplore={() => handleTabChange('map')}
          onViewPlace={pin => {
            setShowOnlyApproved(false)
            setActiveCategory('all')
            setActiveMember('all')
            handleTabChange('map')
            setSelectedPin(pin)
          }}
        />
      )}

      {/* 11. 하단 고정 내비게이션 바 */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        placeCount={filteredPins.length}
        teamCount={teams.length}
      />
    </div>
  )
}

// 같은 장소: 이름이 같고(공백·대소문자 무시) 50m 안. 서버(selectSamePinId)와 같은 기준
const SAME_PLACE_METERS = 50
const nameKey = name => (name || '').replace(/\s/g, '').toLowerCase()
const isSamePlace = (pin, place) =>
  nameKey(pin.name) === nameKey(place.name) && distanceMeters(pin.lat, pin.lng, place.lat, place.lng) < SAME_PLACE_METERS

/**
 * 가로로 넘치는 칩 줄을 마우스로도 넘길 수 있게 한다 (터치는 브라우저가 원래 스크롤한다)
 * - 끌어서 넘기기. 끈 뒤 손을 떼면 칩이 눌리지 않게 클릭을 막는다
 * - 세로 휠을 가로 스크롤로
 */
function useDragScroll() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startX = 0
    let startLeft = 0
    let dragging = false
    let moved = false

    const onDown = e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      dragging = true
      moved = false
      startX = e.clientX
      startLeft = el.scrollLeft
    }
    const onMove = e => {
      if (!dragging) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 5) moved = true
      if (moved) el.scrollLeft = startLeft - dx
    }
    const onUp = () => { dragging = false }
    const onClick = e => {
      if (!moved) return
      e.stopPropagation()
      e.preventDefault()
      moved = false
    }
    const onWheel = e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClick, true)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])
  return ref
}
