import { useState, useMemo, useEffect, useRef } from 'react'
import {
  MapPin, Star, Users, Home, Layers,
  X, Sparkles
} from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { getCurrentUser, setCurrentUserStorage } from '../../../lib/currentUser'
import {
  fetchTeam,
  fetchPins,
  fetchTeamMemberPins,
  createPinApi,
  toggleRecommendationApi,
  updatePinApi,
  deletePinApi,
  fetchPersonalPins,
  createPersonalPinApi,
  updatePersonalPinApi,
  deletePersonalPinApi,
  updatePersonalVisibilityApi
} from '../api'
import { fetchTeams, createTeamApi, joinTeamApi } from '../../teams/api'
import { distanceMeters } from '../places'
import { groupFriendOverlayPins } from '../overlayGrouping'
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
import FriendPanel from '../../friends/components/FriendPanel'
import LayerPanel from '../components/LayerPanel'
import { fetchFriends, fetchFriendPlaces } from '../../friends/api'
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

  // 내 지도(개인 장소) 상태. mapScope 가 'personal' 이면 팀 핀 대신 개인 핀을 보여준다
  const [mapScope, setMapScope] = useState('team') // 'team' | 'personal'
  const [personalPins, setPersonalPins] = useState([])
  const [personalLoadState, setPersonalLoadState] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [showOverlay, setShowOverlay] = useState(true) // 모임 지도 위에 내 공개 핀을 겹쳐 볼지
  const [showFriendPanel, setShowFriendPanel] = useState(false)
  const [friendPendingCount, setFriendPendingCount] = useState(0) // 받은 친구 요청 수 (배지)
  const [friendOverlays, setFriendOverlays] = useState([]) // [{ friend, pins, key }] — 여러 친구 중첩 가능
  const [memberPins, setMemberPins] = useState([]) // 모임원이 공개한 핀 (모임 지도에서만)
  const [showMemberPins, setShowMemberPins] = useState(false)
  const memberPinsTeamRef = useRef(null) // 어느 모임의 핀을 이미 불러왔는지
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [friends, setFriends] = useState([])

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

  // 3. 개인 장소는 앱을 열 때 한 번 불러온다 (내 지도 화면 + 모임 지도 오버레이 둘 다 쓴다)
  //    StrictMode 는 effect 를 두 번 실행한다. 상태가 아니라 ref 로 막아야 두 번째 실행이 첫 요청을 취소하지 않는다
  const personalLoadedRef = useRef(false)
  useEffect(() => {
    if (personalLoadedRef.current) return
    personalLoadedRef.current = true
    setPersonalLoadState('loading')
    fetchPersonalPins()
      .then(data => {
        setPersonalPins(data)
        setPersonalLoadState('ready')
      })
      .catch(e => {
        setPersonalLoadState('error')
        setError(`내 지도를 불러오지 못했습니다: ${e.message}`)
      })
  }, [])

  // 4. 모임원이 공개한 핀은 모임 지도에서만 보여준다 (내 지도에는 노출하지 않는다)
  //    모임을 바꿀 때마다 새로 읽고, 이미 읽은 모임이면 다시 요청하지 않는다
  useEffect(() => {
    if (mapScope !== 'team' || !selectedTeamId) return
    const key = String(selectedTeamId)
    if (memberPinsTeamRef.current === key) return
    memberPinsTeamRef.current = key

    fetchTeamMemberPins(selectedTeamId)
      .then(places => {
        if (memberPinsTeamRef.current !== key) return // 그새 다른 모임으로 바뀌었으면 버린다
        setMemberPins(places)
        setShowMemberPins(places.length > 0)
      })
      .catch(() => {
        if (memberPinsTeamRef.current !== key) return
        setMemberPins([])
        setShowMemberPins(false)
      })
  }, [mapScope, selectedTeamId])

  // 5. 받은 친구 요청 수는 앱을 열 때 한 번 불러 배지로 보여준다
  useEffect(() => {
    let cancelled = false
    fetchFriends()
      .then(data => {
        if (cancelled) return
        setFriendPendingCount(data.pendingCount ?? 0)
        setFriends(data.friends ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // 지금 보고 있는 지도의 핀 (내 지도면 개인 장소, 아니면 선택한 모임의 핀)
  const scopePins = mapScope === 'personal' ? personalPins : pins

  // 모임 지도 위에 겹쳐 그릴 내 공개 핀
  const publicPersonalPins = personalPins.filter(p => p.isPublic)

  // 모임원 공유 핀: 모임 지도에서만, 모임원별로 묶어 친구 오버레이와 같은 모양으로 만든다
  const memberOverlays = useMemo(() => {
    if (mapScope !== 'team' || !showMemberPins) return []
    const byOwner = new Map()
    memberPins.forEach(pin => {
      const id = pin.ownerId || pin.ownerLoginId
      if (!byOwner.has(id)) {
        byOwner.set(id, { friend: { id, nickname: pin.owner, loginId: pin.ownerLoginId }, pins: [] })
      }
      byOwner.get(id).pins.push(pin)
    })
    return [...byOwner.values()]
  }, [mapScope, showMemberPins, memberPins])

  // 친구 지도 + 모임원 공유 핀을 같은 장소끼리 묶는다
  // - 여러 사람이 같은 곳을 저장하면 핀 하나 + 'N명이 추천'
  // - 팀 핀과 겹치면 추천인 수를 합산해 '나 외 N명이 추천'
  const friendOverlayPins = groupFriendOverlayPins(
    [...friendOverlays, ...memberOverlays],
    scopePins,
    currentUser.loginId,
    personalPins
  )

  const overlayPins = [
    ...(mapScope === 'team' && showOverlay ? publicPersonalPins : []),
    ...friendOverlayPins,
  ]

  // 선택한 친구들의 핀이 모두 보이도록 지도를 맞출 때 쓴다 (모임원 핀은 자동으로 맞추지 않는다)
  const focusPlaces = useMemo(() => {
    if (friendOverlays.length === 0) return null
    return {
      places: friendOverlays.flatMap(o => o.pins),
      key: friendOverlays.map(o => o.key).join('-'),
    }
  }, [friendOverlays])

  // 필터링된 핀 목록
  const filteredPins = useMemo(() => {
    return scopePins.filter(pin => {
      if (activeCategory !== 'all' && pin.category !== activeCategory) return false
      if (activeMember !== 'all' && !pin.recommenders.includes(activeMember)) return false
      if (showOnlyApproved && !pin.isAllApproved) return false
      return true
    })
  }, [scopePins, activeCategory, activeMember, showOnlyApproved])

  // 오버레이 핀과 같은 장소의 지도 핀은 숨긴다 — 같은 곳이 두 번 찍히지 않게
  const mapPins = filteredPins.filter(p => !overlayPins.some(o => isSamePlace(p, o)))

  // 현재 모임 정보
  const currentTeam = teams.find(t => String(t.id) === String(selectedTeamId)) || teamDetail
  const allApprovedCount = pins.filter(p => p.isAllApproved).length

  const selectTeam = teamId => {
    setMapScope('team')
    setSelectedTeamId(teamId)
    setActiveMember('all')
    setSelectedPin(null)
  }

  // 내 지도로 전환한다. 팀 전용 필터(멤버·모두 인정)는 초기화한다
  const selectPersonalMap = () => {
    setMapScope('personal')
    setActiveMember('all')
    setActiveCategory('all')
    setShowOnlyApproved(false)
    setSelectedPin(null)
  }

  const closePlaceList = () => {
    setShowListPanel(false)
    setActiveTab(tab => tab === 'places' ? 'map' : tab)
  }

  // 친구 패널을 닫으면서 배지를 다시 읽는다 (패널에서 수락·끊기를 했을 수 있다)
  const closeFriendPanel = () => {
    setShowFriendPanel(false)
    setActiveTab(tab => (tab === 'friends' ? 'map' : tab))
    fetchFriends()
      .then(data => {
        setFriendPendingCount(data.pendingCount ?? 0)
        setFriends(data.friends ?? [])
      })
      .catch(() => {})
  }

  // 친구 레이어를 켜고 끈다 (여러 명 동시에 중첩 가능)
  const handleToggleFriendOverlay = async friend => {
    if (friendOverlays.some(o => String(o.friend.id) === String(friend.id))) {
      setFriendOverlays(prev => prev.filter(o => String(o.friend.id) !== String(friend.id)))
      return
    }
    try {
      const places = await fetchFriendPlaces(friend.id)
      setFriendOverlays(prev => [...prev, { friend, pins: places, key: Date.now() }])
      if (places.length === 0) {
        setError(`${friend.nickname || friend.loginId}님이 공개한 장소가 없습니다.`)
      }
    } catch (e) {
      setError(`친구 지도를 불러오지 못했습니다: ${e.message}`)
    }
  }

  const clearFriendOverlays = () => {
    setFriendOverlays([])
    setShowMemberPins(false)
  }

  // 모임원 공유 핀 레이어 켜고 끄기
  const handleToggleMemberPins = async () => {
    if (showMemberPins) {
      setShowMemberPins(false)
      return
    }
    if (!selectedTeamId) return
    try {
      const places = await fetchTeamMemberPins(selectedTeamId)
      memberPinsTeamRef.current = String(selectedTeamId)
      setMemberPins(places)
      setShowMemberPins(places.length > 0)
      if (places.length === 0) setError('모임원이 공개한 장소가 없습니다.')
    } catch (e) {
      setError(`모임원 공유 핀을 불러오지 못했습니다: ${e.message}`)
    }
  }

  // 친구 지도에서 본 핀을 내 지도에 추가한다 (공개로 저장)
  const handleAddFriendPinToMyMap = async pin => {
    if (personalPins.some(p => isSamePlace(p, pin))) {
      setError('이미 내 지도에 있는 장소예요.')
      return
    }
    try {
      const saved = await createPersonalPinApi({
        name: pin.name,
        category: pin.category,
        address: pin.address,
        roadAddress: pin.roadAddress,
        lat: pin.lat,
        lng: pin.lng,
        memo: pin.memo,
        isPublic: true,
        source: 'search',
      })
      setPersonalPins(prev => [saved, ...prev])
      setSelectedPin(saved)   // 내 핀으로 바뀌어 '내가 저장한 장소'로 확인된다
    } catch (e) {
      setError(`내 지도에 추가하지 못했습니다: ${e.message}`)
    }
  }

  // 친구 레이어 모두 선택 (아직 안 켠 친구만 불러와서 더한다)
  const handleSelectAllFriends = async () => {
    const missing = friends.filter(f => !friendOverlays.some(o => String(o.friend.id) === String(f.id)))
    if (missing.length === 0) return
    const results = await Promise.all(missing.map(async (friend, index) => {
      try {
        return { friend, pins: await fetchFriendPlaces(friend.id), key: Date.now() + index }
      } catch {
        return null
      }
    }))
    setFriendOverlays(prev => [...prev, ...results.filter(Boolean)])
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
    // 내 지도: 팀 핀 대신 개인 장소로 저장한다
    if (mapScope === 'personal') {
      const same = personalPins.find(p => isSamePlace(p, newPinData))
      if (same) {
        setShowAddPinModal(false)
        setSelectedPin(same)
        setError(`'${same.name}'은(는) 이미 내 지도에 있는 장소예요.`)
        return
      }
      try {
        const saved = await createPersonalPinApi(newPinData)
        setPersonalPins(prev => [saved, ...prev])
        setShowAddPinModal(false)
        setSelectedPin(saved)
      } catch (e) {
        setError(`장소 추가에 실패했습니다: ${e.message}`)
      }
      return
    }

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

      // '내 지도에도 저장' 을 체크했으면 개인 장소로도 저장한다 (팀 등록은 이미 성공)
      if (newPinData.syncToPersonal) {
        try {
          const personal = await createPersonalPinApi({ ...newPinData, isPublic: true })
          setPersonalPins(prev => [personal, ...prev])
        } catch {
          setError('모임에는 저장했지만 내 지도에는 저장하지 못했습니다.')
        }
      }
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

  // 이 id 가 내 지도(개인) 핀인지. 모임 지도 위 오버레이 핀도 개인 핀으로 취급한다
  const isPersonalPinId = pinId => personalPins.some(p => p.id === pinId)

  // 공개/비공개 전환 (공개한 핀만 모임 지도에 겹쳐 보인다)
  const handleToggleVisibility = async (pinId, isPublic) => {
    try {
      const updated = await updatePersonalVisibilityApi(pinId, isPublic)
      setPersonalPins(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      setSelectedPin(updated)
    } catch (e) {
      setError(`공개 설정 변경에 실패했습니다: ${e.message}`)
    }
  }

  // 장소 수정 핸들러 (성공 여부를 돌려줘 패널이 수정 모드를 닫을 수 있게 한다)
  const handleUpdatePin = async (pinId, data) => {
    if (isPersonalPinId(pinId)) {
      try {
        const updated = await updatePersonalPinApi(pinId, data)
        setPersonalPins(prev => prev.map(p => (p.id === updated.id ? updated : p)))
        setSelectedPin(updated)
        return true
      } catch (e) {
        setError(`장소 수정에 실패했습니다: ${e.message}`)
        return false
      }
    }
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
    if (isPersonalPinId(pinId)) {
      try {
        await deletePersonalPinApi(pinId)
        setPersonalPins(prev => prev.filter(p => p.id !== pinId))
        setSelectedPin(null)
      } catch (e) {
        setError(`장소 삭제에 실패했습니다: ${e.message}`)
      }
      return
    }
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
      setShowFriendPanel(false)
    } else if (tabId === 'teams') {
      setShowListPanel(false)
      setShowFriendPanel(false)
      setShowTeamDrawer(true)
    } else if (tabId === 'places') {
      setShowTeamDrawer(false)
      setShowFriendPanel(false)
      setShowListPanel(true)
    } else if (tabId === 'friends') {
      setShowTeamDrawer(false)
      setShowListPanel(false)
      setShowFriendPanel(true)
    } else if (tabId === 'settings') {
      setShowTeamDrawer(false)
      setShowListPanel(false)
      setShowFriendPanel(false)
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
            pins={mapPins}
            members={members}
            onSelectPin={setSelectedPin}
            selectedPin={selectedPin}
            overlayPins={overlayPins}
            onSelectOverlayPin={pin => setSelectedPin(pin)}
            focusPlaces={focusPlaces}
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
          {/* 검색: 지금 보는 지도(모임 또는 내 지도)의 장소 + 상호명·주소 */}
          <TopSearch
            pins={scopePins}
            onSelectPin={pin => { setSelectedPin(pin); closePlaceList() }}
            onPickPlace={place => { setSelectedPin(null); setFocusPlace({ ...place, key: Date.now() }) }}
          />

        </div>

        <div className={styles.filterBar}>
        {/* 모임·카테고리·멤버 칩은 함께 가로로 넘긴다 */}
        <div className={styles.chipsScroll} ref={chipsRef} role="group" aria-label="지도 필터">
          {/* 내 지도: 모임 없이도 쓸 수 있는 개인 지도 */}
          <button
            className={`${styles.chip} ${styles.touchArea} ${mapScope === 'personal' ? styles.chipActive : ''}`}
            aria-pressed={mapScope === 'personal'}
            onClick={selectPersonalMap}
          >
            <Home size={12} />
            <span>내 지도</span>
            <span className={styles.chipCount}>{personalPins.length}</span>
          </button>
          <div className={styles.chipDivider} />

          {teams.map(team => {
            const isTeamActive = mapScope === 'team' && String(team.id) === String(selectedTeamId)
            return (
              <button
                key={team.id}
                className={`${styles.chip} ${styles.touchArea} ${isTeamActive ? styles.chipActive : ''}`}
                aria-pressed={isTeamActive}
                onClick={() => selectTeam(team.id)}
              >
                <Users size={12} />
                <span>{team.name}</span>
              </button>
            )
          })}
          {teams.length > 0 && <div className={styles.chipDivider} />}

          {/* 모두 인정 빠른 필터 (팀 지도에서만) */}
          {mapScope === 'team' && (
            <>
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
            </>
          )}

          {/* 카테고리 칩들 */}
          {CATEGORIES.map(cat => {
            const meta = cat === 'all' ? { label: '전체', icon: '🗺️' } : (CATEGORY_META[cat] || CATEGORY_META.etc)
            const count = cat === 'all' ? scopePins.length : scopePins.filter(p => p.category === cat).length
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

          {/* 팀원 필터 칩들 (팀 지도에서만) */}
          {mapScope === 'team' && members.length > 0 && (
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
        </div>

        {/* 대기 중인 친구 요청이 있으면 지도 위에 바로 보여준다 */}
        {friendPendingCount > 0 && (
          <button
            className={styles.friendRequestBanner}
            onClick={() => { setShowListPanel(false); setShowFriendPanel(true); setActiveTab('friends') }}
          >
            <Users size={14} />
            <span>친구 요청 {friendPendingCount}건</span>
            <span className={styles.friendRequestAction}>확인</span>
          </button>
        )}

        {/* 지도 위 레이어가 켜져 있으면 무엇이 겹쳐 있는지 보여준다 */}
        {(friendOverlays.length > 0 || memberOverlays.length > 0) && (
          <button className={styles.friendOverlayChip} onClick={clearFriendOverlays}>
            <MapPin size={13} />
            <span>
              {friendOverlays.length > 0 && memberOverlays.length > 0
                ? `친구 ${friendOverlays.length}명 · 모임원 ${memberPins.length}곳`
                : friendOverlays.length > 0
                  ? (friendOverlays.length === 1
                    ? `${friendOverlays[0].friend.nickname || friendOverlays[0].friend.loginId}님 지도`
                    : `친구 ${friendOverlays.length}명 지도`)
                  : `모임원 공유 핀 ${memberPins.length}곳`}
            </span>
            <span className={styles.friendOverlayClose}>끄기</span>
          </button>
        )}
      </div>

      {/* 지도 레이어 (내 공개 핀·모임원 공유 핀·친구 지도 선택). 내 지도·모임 지도 모두에서 */}
      {(mapScope === 'team' || friends.length > 0 || publicPersonalPins.length > 0) && (
        <button
          className={`${styles.layerBtn} ${(showLayerPanel || friendOverlays.length > 0 || memberOverlays.length > 0 || showOverlay) ? styles.layerBtnActive : ''} ${showFriendPanel ? styles.hideOnNarrow : ''}`}
          onClick={() => setShowLayerPanel(v => !v)}
          aria-pressed={showLayerPanel}
          title="지도 레이어"
        >
          <Layers size={18} />
          {(publicPersonalPins.length + (mapScope === 'team' ? memberPins.length : 0)) > 0 && (
            <span className={styles.layerCount}>
              {publicPersonalPins.length + (mapScope === 'team' ? memberPins.length : 0)}
            </span>
          )}
        </button>
      )}

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
          members={selectedPin?.personal ? [] : members}
          personal={Boolean(selectedPin?.personal)}
          ownerName={selectedPin?.owner}
          overlay={Boolean(selectedPin?.personal) && !selectedPin?.owner && mapScope === 'team'}
          onAddToMyMap={selectedPin?.owner ? () => handleAddFriendPinToMyMap(selectedPin) : undefined}
          alreadyAdded={selectedPin?.owner ? personalPins.some(p => isSamePlace(p, selectedPin)) : false}
          onClose={() => setSelectedPin(null)}
          onRecommend={selectedPin?.personal ? undefined : () => handleRecommend(selectedPin.id)}
          onUpdate={selectedPin?.owner ? undefined : handleUpdatePin}
          onDelete={selectedPin?.owner ? undefined : handleDeletePin}
          onToggleVisibility={selectedPin?.personal && !selectedPin?.owner ? isPublic => handleToggleVisibility(selectedPin.id, isPublic) : undefined}
          onRoute={pin => { setRouteTarget(pin); setRoutePanelOpen(true); setSelectedPin(null); setShowListPanel(false) }}
        />
      )}

      {/* 5. 장소 목록 패널 (사이드/바텀 드로어) */}
      {showListPanel && (
        <PlaceListPanel
          pins={filteredPins}
          members={members}
          sort={placeSort}
          onSortChange={setPlaceSort}
          onSelectPin={pin => { setSelectedPin(pin); closePlaceList() }}
          onClose={closePlaceList}
          emptyMessage={showOnlyApproved ? '모두 인정한 장소가 없습니다' : '아직 등록된 장소가 없습니다'}
        />
      )}

      {/* 5-1. 친구 패널 (지도 우측 시트) */}
      {showFriendPanel && <FriendPanel onClose={closeFriendPanel} />}

      {/* 5-2. 지도 레이어 선택 패널 */}
      {showLayerPanel && (
        <LayerPanel
          friends={friends}
          activeFriendIds={friendOverlays.map(o => o.friend.id)}
          showMine={showOverlay}
          showMineOption={mapScope === 'team'}
          onToggleMine={() => setShowOverlay(v => !v)}
          showMembersOption={mapScope === 'team'}
          showMembers={showMemberPins}
          memberCount={memberPins.length}
          onToggleMembers={handleToggleMemberPins}
          onSelectFriend={handleToggleFriendOverlay}
          onSelectAll={handleSelectAllFriends}
          onClear={clearFriendOverlays}
          onClose={() => setShowLayerPanel(false)}
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
          personal={mapScope === 'personal'}
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
        friendCount={friendPendingCount}
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
