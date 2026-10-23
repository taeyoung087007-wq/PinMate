import { useState, useMemo, useEffect } from 'react'
import {
  MapPin, List, Plus, Search, Star, Users,
  ChevronDown, X, Sparkles
} from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { getCurrentUser } from '../../../lib/currentUser'
import {
  fetchTeam,
  fetchPins,
  createPinApi,
  toggleRecommendationApi,
  toggleVisitApi,
  updatePinApi,
  deletePinApi
} from '../api'
import { fetchTeams, createTeamApi, joinTeamApi } from '../../teams/api'
import MapCanvas from '../components/MapCanvas'
import PinDetailPanel from '../components/PinDetailPanel'
import AddPinModal from '../components/AddPinModal'
import PlaceListPanel from '../components/PlaceListPanel'
import CelebrationModal from '../components/CelebrationModal'
import BottomNav from '../../../components/BottomNav/BottomNav'
import TeamDrawer from '../../teams/components/TeamDrawer'
import TeamCreateModal from '../../teams/components/TeamCreateModal'
import ProfileModal from '../../auth/components/ProfileModal'
import styles from './MapPage.module.css'

/** 카테고리 필터 목록 */
const CATEGORIES = ['all', 'food', 'cafe', 'drink', 'stay', 'sight', 'play', 'etc']

/**
 * 네이버지도/카카오맵 스타일 메인 지도 앱 페이지
 * - 전체 화면 캔버스 지도 메인
 * - 상단 플로팅 바 (모임 전환 드롭다운 + 검색창 + 카테고리/팀원 칩)
 * - 우측 플로팅 액션 버튼 (장소 추가 FAB, 모두 인정 토글, 목록 토글)
 * - 하단 고정 내비게이션 바 (지도, 모임, 모두인정, 마이)
 */
export default function MapPage({ initialTeamId, onLogout }) {
  // 사용자 상태
  const [currentUser] = useState(getCurrentUser)

  // 모임 목록 상태
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || null)
  const [teamDetail, setTeamDetail] = useState(null)
  const members = teamDetail?.members ?? []

  // 핀 상태
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [error, setError] = useState('')

  // UI 제어 상태
  const [activeTab, setActiveTab] = useState('map')
  const [showTeamDrawer, setShowTeamDrawer] = useState(false)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showAddPinModal, setShowAddPinModal] = useState(false)
  const [pickedPlace, setPickedPlace] = useState(null) // 메인 지도에서 고른 위치로 장소 추가할 때
  const [showListPanel, setShowListPanel] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [celebrationPin, setCelebrationPin] = useState(null)

  // 필터 상태
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeMember, setActiveMember] = useState('all')
  const [showOnlyApproved, setShowOnlyApproved] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
    Promise.all([fetchTeam(selectedTeamId), fetchPins(selectedTeamId)])
      .then(([tData, pData]) => {
        setTeamDetail(tData)
        setPins(pData)
        setSelectedPin(null) // 모임 변경 시 선택 핀 해제
      })
      .catch(e => setError(`지도 데이터를 불러오지 못했습니다: ${e.message}`))
  }, [selectedTeamId])

  // 필터링된 핀 목록
  const filteredPins = useMemo(() => {
    return pins.filter(pin => {
      if (activeCategory !== 'all' && pin.category !== activeCategory) return false
      if (activeMember !== 'all' && !pin.recommenders.includes(activeMember)) return false
      if (showOnlyApproved && !pin.isAllApproved) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = pin.name?.toLowerCase().includes(q)
        const matchesAddr = pin.address?.toLowerCase().includes(q)
        if (!matchesName && !matchesAddr) return false
      }
      return true
    })
  }, [pins, activeCategory, activeMember, showOnlyApproved, searchQuery])

  // 현재 모임 정보
  const currentTeam = teams.find(t => String(t.id) === String(selectedTeamId)) || teamDetail
  const allApprovedCount = pins.filter(p => p.isAllApproved).length

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

  // 핀 추가 핸들러
  const handleAddPin = async (newPinData) => {
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

  // 방문 토글 핸들러
  const handleToggleVisit = async (pinId) => {
    try {
      const updated = await toggleVisitApi(pinId, currentUser.id)
      setPins(prev => prev.map(p => p.id === updated.id ? updated : p))
      setSelectedPin(updated)
    } catch (e) {
      setError(`방문 처리에 실패했습니다: ${e.message}`)
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
      setShowProfileModal(false)
    } else if (tabId === 'teams') {
      setShowTeamDrawer(true)
    } else if (tabId === 'approved') {
      setShowOnlyApproved(true)
      setShowListPanel(true)
    } else if (tabId === 'profile') {
      setShowProfileModal(true)
    }
  }

  return (
    <div className={styles.appRoot}>
      {/* 1. 전체 화면 메인 지도 */}
      <div className={styles.mapCanvasWrap}>
        <MapCanvas
          pins={filteredPins}
          members={members}
          onSelectPin={setSelectedPin}
          selectedPin={selectedPin}
          onAddAtLocation={place => { setPickedPlace(place); setShowAddPinModal(true) }}
        />
      </div>

      {/* 2. 상단 플로팅 헤더 (팀 선택 + 검색 + 카테고리 바) */}
      <div className={styles.floatingTop}>
        <div className={styles.topCard}>
          {/* 모임 전환 버튼 */}
          <button
            className={styles.teamSwitchBtn}
            onClick={() => setShowTeamDrawer(true)}
            title="모임 변경"
          >
            <span className={styles.teamBadgeDot}>📍</span>
            <span className={styles.teamTitle}>
              {currentTeam?.name || '모임 선택'}
            </span>
            <ChevronDown size={14} className={styles.teamArrow} />
          </button>

          {/* 인라인 검색창 */}
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="장소명, 주소 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 가로 스크롤 카테고리 & 멤버 칩 */}
        <div className={styles.chipsScroll}>
          {/* 모두 인정 빠른 필터 */}
          <button
            className={`${styles.chip} ${showOnlyApproved ? styles.chipApprovedActive : ''}`}
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
                className={`${styles.chip} ${isCatActive ? styles.chipActive : ''}`}
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
                    className={`${styles.chip} ${isMemberActive ? styles.chipActive : ''}`}
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
      </div>

      {/* 에러 알림 배너 */}
      {error && (
        <div className={styles.errorFloat}>
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.errorClose}><X size={12} /></button>
        </div>
      )}

      {/* 3. 우측 플로팅 액션 버튼 (FAB & 목록) */}
      <div className={styles.floatingActions}>
        <button
          className={styles.listFab}
          onClick={() => setShowListPanel(p => !p)}
          title="장소 목록 보기"
        >
          <List size={18} />
          <span>목록</span>
        </button>

        <button
          className={styles.addFab}
          onClick={() => { setPickedPlace(null); setShowAddPinModal(true) }}
          title="새 장소 추가"
        >
          <Plus size={20} strokeWidth={2.6} />
          <span>장소 추가</span>
        </button>
      </div>

      {/* 4. 장소 상세 정보 패널 (하단 바텀시트) */}
      {selectedPin && (
        <PinDetailPanel
          pin={selectedPin}
          members={members}
          onClose={() => setSelectedPin(null)}
          onRecommend={() => handleRecommend(selectedPin.id)}
          onToggleVisit={() => handleToggleVisit(selectedPin.id)}
          onUpdate={handleUpdatePin}
          onDelete={handleDeletePin}
        />
      )}

      {/* 5. 장소 목록 패널 (사이드/바텀 드로어) */}
      {showListPanel && (
        <PlaceListPanel
          pins={filteredPins}
          members={members}
          onSelectPin={(pin) => { setSelectedPin(pin); setShowListPanel(false); }}
          onClose={() => setShowListPanel(false)}
        />
      )}

      {/* 6. 모임 목록 바텀시트 */}
      <TeamDrawer
        isOpen={showTeamDrawer}
        teams={teams}
        activeTeamId={selectedTeamId}
        onSelectTeam={(tId) => { setSelectedTeamId(tId); setActiveTab('map'); }}
        onOpenCreate={() => { setShowTeamDrawer(false); setShowCreateTeamModal(true); }}
        onJoinTeam={handleJoinTeam}
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

      {/* 10. 프로필 / 사용자 전환 모달 */}
      <ProfileModal
        isOpen={showProfileModal}
        currentUser={currentUser}
        onLogout={onLogout}
        onClose={() => { setShowProfileModal(false); setActiveTab('map'); }}
      />

      {/* 11. 하단 고정 내비게이션 바 */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        approvedCount={allApprovedCount}
        teamCount={teams.length}
      />
    </div>
  )
}
