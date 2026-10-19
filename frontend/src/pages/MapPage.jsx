import { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft, MapPin, List, Plus, Search,
  Filter, Star, Navigation, Users, ChevronDown, X
} from 'lucide-react'
import { CATEGORY_META, CURRENT_USER } from '../data/mockData'
import {
  getStoredTeams,
  getStoredPins,
  addPin as savePinToStorage,
  togglePinRecommendation,
  togglePinVisit
} from '../services/storage'
import MapCanvas from '../components/MapCanvas'
import PinDetailPanel from '../components/PinDetailPanel'
import AddPinModal from '../components/AddPinModal'
import PlaceListPanel from '../components/PlaceListPanel'
import CelebrationModal from '../components/CelebrationModal'
import styles from './MapPage.module.css'

/** 카테고리 필터 목록 */
const CATEGORIES = ['all', 'food', 'cafe', 'drink', 'stay', 'sight', 'play', 'etc']

/**
 * 팀 장소 공유 지도 메인 페이지
 * - 상단: 팀 정보, 멤버별 필터 칩, '모두 인정' 토글, 장소 추가, 목록 보기
 * - 카테고리 바: 맛집, 카페 등 카테고리 뱃지 및 검색바
 * - 중앙: 인터랙티브 캔버스 지도
 * - 하단/우측: 장소 상세 정보 패널, 장소 리스트 패널
 * - 팝업: '모두 인정' 달성 축하 팡파레 모달
 */
export default function MapPage({ teamId, onBack }) {
  const [teams, setTeams] = useState(getStoredTeams())
  const team = teams.find(t => t.id === teamId) || teams[0]
  const members = team?.members ?? []

  // 현재 팀의 핀 목록 상태
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showList, setShowList] = useState(false)
  const [celebrationPin, setCelebrationPin] = useState(null)

  // 필터 상태
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeMember, setActiveMember] = useState('all')
  const [showOnlyApproved, setShowOnlyApproved] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 로컬 스토리지에서 핀 불러오기
  useEffect(() => {
    const allPins = getStoredPins()
    const teamPins = allPins.filter(p => p.teamId === teamId)
    setPins(teamPins)
  }, [teamId])

  // 조건에 맞게 필터링된 핀 목록
  const filteredPins = useMemo(() => {
    return pins.filter(pin => {
      if (activeCategory !== 'all' && pin.category !== activeCategory) return false
      if (activeMember !== 'all' && !pin.recommenders.includes(activeMember)) return false
      if (showOnlyApproved && !pin.isAllApproved) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = pin.name?.toLowerCase().includes(query)
        const matchesAddress = pin.address?.toLowerCase().includes(query)
        if (!matchesName && !matchesAddress) return false
      }
      return true
    })
  }, [pins, activeCategory, activeMember, showOnlyApproved, searchQuery])

  // 새 핀 추가 핸들러
  const handleAddPin = (newPinData) => {
    const savedPin = savePinToStorage(newPinData)
    setPins(prev => [savedPin, ...prev])
    setShowAddModal(false)
    setSelectedPin(savedPin)
  }

  // 추천하기 / 추천 취소 핸들러 ('모두 인정' 달성 시 축하 팡파레)
  const handleRecommend = (pinId) => {
    const { updatedPin, reachedAllApproved } = togglePinRecommendation(
      pinId,
      CURRENT_USER.id,
      members.length
    )

    if (updatedPin) {
      setPins(prev => prev.map(p => p.id === pinId ? updatedPin : p))
      setSelectedPin(updatedPin)

      // 팀원 전원 추천 달성 시 축하 모달 발동!
      if (reachedAllApproved) {
        setCelebrationPin(updatedPin)
      }
    }
  }

  // 방문 여부 토글 핸들러
  const handleToggleVisit = (pinId) => {
    const { updatedPin } = togglePinVisit(pinId, CURRENT_USER.id)
    if (updatedPin) {
      setPins(prev => prev.map(p => p.id === pinId ? updatedPin : p))
      setSelectedPin(updatedPin)
    }
  }

  return (
    <div className={styles.container}>
      {/* 상단 툴바 */}
      <div className={styles.topBar}>
        <button className={`btn btn-ghost ${styles.backBtn}`} onClick={onBack}>
          <ArrowLeft size={16} />
          팀 목록
        </button>

        {/* 팀명 및 팀원 필터 칩 */}
        <div className={styles.topCenter}>
          <span className={styles.teamName}>{team?.name}</span>
          <div className={styles.memberPills}>
            {members.map(m => (
              <button
                key={m.id}
                className={`${styles.memberPill} ${activeMember === m.id ? styles.memberPillActive : ''}`}
                style={activeMember === m.id ? { borderColor: m.avatarColor, color: m.avatarColor } : {}}
                onClick={() => setActiveMember(prev => prev === m.id ? 'all' : m.id)}
                title={`${m.nickname}님의 추천 장소만 보기`}
              >
                <span
                  className={styles.memberDot}
                  style={{ background: m.avatarColor }}
                />
                {m.nickname}
              </button>
            ))}
          </div>
        </div>

        {/* 우측 상단 주요 액션 버튼 */}
        <div className={styles.topActions}>
          <button
            className={`btn btn-secondary ${showOnlyApproved ? styles.approvedActive : ''}`}
            onClick={() => setShowOnlyApproved(p => !p)}
            style={{ fontSize: '13px', padding: '8px 14px', gap: '6px' }}
            title="팀원 전원이 인정한 맛집만 보기"
          >
            <Star size={14} fill={showOnlyApproved ? 'var(--warning)' : 'none'} color={showOnlyApproved ? 'var(--warning)' : undefined} />
            모두 인정 ({pins.filter(p => p.isAllApproved).length})
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            장소 추가
          </button>
          <button
            className={`btn btn-secondary btn-icon`}
            onClick={() => setShowList(p => !p)}
            title="장소 목록 열기"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* 카테고리 필터 바 & 검색바 */}
      <div className={styles.categoryBar}>
        <div className={styles.categoryScroll}>
          {CATEGORIES.map(cat => {
            const meta = cat === 'all' ? { label: '전체', icon: '🗺️' } : (CATEGORY_META[cat] || CATEGORY_META.etc)
            const count = cat === 'all' ? pins.length : pins.filter(p => p.category === cat).length
            return (
              <button
                key={cat}
                className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className={styles.catCount}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* 인라인 검색창 */}
        <div className={styles.mapSearch}>
          <Search size={14} className={styles.mapSearchIcon} />
          <input
            className={styles.mapSearchInput}
            placeholder="장소명, 주소 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.mapSearchClear} onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 메인 지도 영역 */}
      <div className={styles.mapArea}>
        <MapCanvas
          pins={filteredPins}
          members={members}
          onSelectPin={setSelectedPin}
          selectedPin={selectedPin}
        />

        {/* 장소 상세 슬라이드업 패널 */}
        {selectedPin && (
          <PinDetailPanel
            pin={selectedPin}
            members={members}
            onClose={() => setSelectedPin(null)}
            onRecommend={() => handleRecommend(selectedPin.id)}
            onToggleVisit={() => handleToggleVisit(selectedPin.id)}
          />
        )}

        {/* 사이드 장소 목록 패널 */}
        {showList && (
          <PlaceListPanel
            pins={filteredPins}
            members={members}
            onSelectPin={(pin) => { setSelectedPin(pin); setShowList(false) }}
            onClose={() => setShowList(false)}
          />
        )}

        {/* 지도 좌측 하단 통계 오버레이 */}
        <div className={styles.statsOverlay}>
          <div className={styles.statItem} title="현재 표시된 핀 개수">
            <MapPin size={12} color="var(--primary-light)" />
            <span>총 {filteredPins.length}곳</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem} title="모두가 인정한 핀 개수">
            <Star size={12} color="var(--warning)" fill="var(--warning)" />
            <span>인정 {filteredPins.filter(p => p.isAllApproved).length}곳</span>
          </div>
        </div>
      </div>

      {/* 장소 추가 모달 */}
      {showAddModal && (
        <AddPinModal
          teamId={teamId}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPin}
        />
      )}

      {/* 모두 인정 달성 축하 팡파레 모달 */}
      {celebrationPin && (
        <CelebrationModal
          pin={celebrationPin}
          onClose={() => setCelebrationPin(null)}
        />
      )}
    </div>
  )
}
