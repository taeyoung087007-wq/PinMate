import { useState, useMemo, useEffect, useRef } from 'react'
import {
  MapPin, Star, Users, Home, Layers,
  X
} from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { getCurrentUser, setCurrentUserStorage } from '../../../lib/currentUser'
import {
  fetchTeam,
  fetchPins,
  importPersonalPlaces,
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
import { isSamePlace } from '../places'
import { groupLayerPins } from '../overlayGrouping'
import MapCanvas from '../components/MapCanvas'
import ErrorBoundary from '../../../components/ErrorBoundary/ErrorBoundary'
import TopSearch from '../components/TopSearch'
import PinDetailPanel from '../components/PinDetailPanel'
import AddPinModal from '../components/AddPinModal'
import ImportPersonalPinsModal from '../components/ImportPersonalPinsModal'
import PlaceListPanel from '../components/PlaceListPanel'
import CelebrationModal from '../components/CelebrationModal'
import BottomNav from '../../../components/BottomNav/BottomNav'
import TeamDrawer from '../../teams/components/TeamDrawer'
import TeamCreateModal from '../../teams/components/TeamCreateModal'
import SettingsPage from '../../auth/pages/SettingsPage'
import FriendPanel from '../../friends/components/FriendPanel'
import SyncNotificationPanel from '../../notifications/components/SyncNotificationPanel'
import { useSyncNotifications } from '../../notifications/useSyncNotifications'
import LayerPanel from '../components/LayerPanel'
import { useFriendLayers } from '../useFriendLayers'
import { useMemberPins } from '../useMemberPins'
import { useDragScroll } from '../../../lib/useDragScroll'
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
  const [mapScope, setMapScope] = useState('personal') // 'team' | 'personal' — 처음 들어오면 내 지도
  const [personalFocusKey, setPersonalFocusKey] = useState(1) // 내 지도로 들어올 때마다 지도를 내 핀에 맞춘다
  const [personalPins, setPersonalPins] = useState([])
  const [showOverlay, setShowOverlay] = useState(true) // 모임 지도 위에 내 공개 핀을 겹쳐 볼지
  const [showFriendPanel, setShowFriendPanel] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [importTarget, setImportTarget] = useState(null) // { teamId, teamName, places } — 개인 핀 가져오기 모달
  const [notice, setNotice] = useState('') // 짧게 보여주는 성공 안내

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
    fetchPersonalPins()
      .then(setPersonalPins)
      .catch(e => setError(`내 지도를 불러오지 못했습니다: ${e.message}`))
  }, [])

  // 반영하면 내 지도가 바뀌므로 개인 장소도 다시 읽는다
  const refreshPersonalPins = async () => {
    try {
      setPersonalPins(await fetchPersonalPins())
    } catch {
      // 지도는 그대로 두고 알림만 갱신한다
    }
  }

  // 4. 친구 지도 레이어, 모임원 공유 핀 레이어, 동기화 알림
  const friendLayers = useFriendLayers({ onError: setError })
  const memberLayer = useMemberPins({ mapScope, teamId: selectedTeamId, onError: setError })
  const sync = useSyncNotifications({ onError: setError, onApplied: refreshPersonalPins })

  // 5. 성공 안내는 잠시 뒤 사라진다
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  // 지금 보고 있는 지도의 핀 (내 지도면 개인 장소, 아니면 선택한 모임의 핀)
  const scopePins = mapScope === 'personal' ? personalPins : pins

  // 모임 지도 위에 겹쳐 그릴 내 공개 핀
  const publicPersonalPins = personalPins.filter(p => p.visibility === 'team' || p.visibility === 'all')

  // 친구 레이어는 내 지도에서만 쓴다 (모임 지도에는 내 핀·모임원 핀만)
  const visibleFriendOverlays = useMemo(
    () => (mapScope === 'personal' ? friendLayers.overlays : []),
    [mapScope, friendLayers.overlays]
  )

  // 레이어 출처별로 따로 묶는다. 친구 지도는 내 지도 전용, 모임원 공유 핀·내 공개 핀은 모임 지도 전용
  // - 여러 사람이 같은 곳을 저장하면 핀 하나 + 'N명이 추천'
  // - 지금 지도 핀과 겹치면 추천인 수를 합산해 '나 외 N명이 추천'
  // - overlayKind 를 붙여 친구 / 모임원 / 내 공개 핀의 테두리·태그를 서로 다르게 그린다
  const friendOverlayPins = groupLayerPins(
    'friend', visibleFriendOverlays, scopePins, currentUser.loginId, personalPins
  )

  const memberOverlayPins = groupLayerPins(
    'member', memberLayer.overlays, scopePins, currentUser.loginId, personalPins
  )

  const overlayPins = [
    ...(mapScope === 'team' && showOverlay
      ? publicPersonalPins.map(pin => ({ ...pin, overlayKind: 'mine' }))
      : []),
    ...friendOverlayPins,
    ...memberOverlayPins,
  ]

  // 선택한 친구들의 핀이 모두 보이도록 지도를 맞출 때 쓴다 (모임원 핀은 자동으로 맞추지 않는다)
  // 지도를 맞출 대상: 친구 지도를 고르면 그 핀들, 내 지도면 내 핀들
  const focusPlaces = useMemo(() => {
    if (visibleFriendOverlays.length > 0) {
      return {
        places: visibleFriendOverlays.flatMap(o => o.pins),
        key: visibleFriendOverlays.map(o => o.key).join('-'),
      }
    }
    if (mapScope === 'personal' && personalPins.length > 0) {
      return { places: personalPins, key: `personal-${personalFocusKey}` }
    }
    return null
  }, [visibleFriendOverlays, mapScope, personalPins, personalFocusKey])

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
    setPersonalFocusKey(Date.now())   // 내 지도로 들어오면 내 핀들이 보이게 지도를 맞춘다
  }

  const closePlaceList = () => {
    setShowListPanel(false)
    setActiveTab(tab => tab === 'places' ? 'map' : tab)
  }

  // 친구 패널을 닫으면서 배지를 다시 읽는다 (패널에서 수락·끊기를 했을 수 있다)
  const closeFriendPanel = () => {
    setShowFriendPanel(false)
    setActiveTab(tab => (tab === 'friends' ? 'map' : tab))
    friendLayers.refresh()
  }

  // 레이어 끄기: 친구 지도와 모임원 공유 핀을 함께 끈다
  const clearFriendOverlays = () => {
    friendLayers.clear()
    memberLayer.hide()
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
        visibility: 'all',
        source: 'search',
        kakaoPlaceId: pin.kakaoPlaceId ?? null,
      })
      setPersonalPins(prev => [saved, ...prev])
      setSelectedPin(saved)   // 내 핀으로 바뀌어 '내가 저장한 장소'로 확인된다
    } catch (e) {
      setError(`내 지도에 추가하지 못했습니다: ${e.message}`)
    }
  }

  const closeNotificationPanel = () => {
    setShowNotificationPanel(false)
    setActiveTab(tab => (tab === 'notifications' ? 'map' : tab))
    sync.refreshCount()
  }

  // 새 모임 생성 완료 핸들러
  const handleCreateTeam = async (name) => {
    const newTeam = await createTeamApi(name, currentUser.id)
    setTeams(prev => [newTeam, ...prev])
    setSelectedTeamId(newTeam.id)
    setShowTeamDrawer(false)
    // 가져오기 확인은 생성 모달을 닫을 때 띄운다 (모달이 겹치지 않게)
    return newTeam
  }

  // 초대 코드로 모임 참여 (이미 멤버여도 같은 팀이 돌아온다)
  const handleJoinTeam = async (code) => {
    const team = await joinTeamApi(code, currentUser.id)
    setTeams(prev => [team, ...prev.filter(t => String(t.id) !== String(team.id))])
    setSelectedTeamId(team.id)
    setActiveTab('map')
    // 참여 직후에도 내 장소를 가져올지 물어본다
    if (personalPins.length > 0) {
      setImportTarget({ teamId: team.id, teamName: team.name, places: personalPins })
    }
    return team
  }

  // 개인 핀을 모임으로 가져오기 (같은 장소는 내 추천으로 합쳐진다)
  const handleImportPersonalPlaces = async ids => {
    if (!importTarget) return
    const { teamId } = importTarget
    try {
      const result = await importPersonalPlaces(teamId, ids.map(Number))
      const total = (result.imported ?? 0) + (result.recommended ?? 0)
      setImportTarget(null)
      setNotice(total > 0 ? `모임에 ${total}곳을 가져왔습니다.` : '가져올 장소가 없었습니다.')
      if (String(selectedTeamId) === String(teamId)) {
        setPins(await fetchPins(teamId))
      }
    } catch (e) {
      setError(`장소를 가져오지 못했습니다: ${e.message}`)
    }
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
          const personal = await createPersonalPinApi({ ...newPinData, visibility: 'all' })
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
  // 내 지도에 같은 장소가 있으면 함께 지운다 (모임 핀 삭제·추천 취소에서 선택했을 때)
  const deletePersonalCopyOf = async pin => {
    const copy = personalPins.find(p => isSamePlace(p, pin))
    if (!copy) return
    try {
      await deletePersonalPinApi(copy.id)
      setPersonalPins(prev => prev.filter(p => p.id !== copy.id))
    } catch (e) {
      setError(`내 지도에서 삭제하지 못했습니다: ${e.message}`)
    }
  }

  const handleRecommend = async (pinId, opts = {}) => {
    const target = pins.find(p => p.id === pinId)
    try {
      const { pin, reachedAllApproved } = await toggleRecommendationApi(pinId, currentUser.id)
      setPins(prev => prev.map(p => p.id === pin.id ? pin : p))
      setSelectedPin(pin)
      if (reachedAllApproved) {
        setCelebrationPin(pin)
      }
      if (opts.deletePersonal && target) await deletePersonalCopyOf(target)
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

  // 공개 범위 변경 (private 나만 / friends 친구 / team 모임 / all 전체)
  const handleSetVisibility = async (pinId, visibility) => {
    try {
      const updated = await updatePersonalVisibilityApi(pinId, visibility)
      setPersonalPins(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      setSelectedPin(updated)
    } catch (e) {
      setError(`공개 설정 변경에 실패했습니다: ${e.message}`)
    }
  }

  // 모임 지도에서만 빼기: 전체 → 친구, 모임만 → 나만
  const handleUnshareFromTeam = async pin => {
    const next = pin.visibility === 'all' ? 'friends' : 'private'
    await handleSetVisibility(pin.id, next)
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
  const handleDeletePin = async (pinId, opts = {}) => {
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
    const target = pins.find(p => p.id === pinId)
    try {
      await deletePinApi(pinId)
      setPins(prev => prev.filter(p => p.id !== pinId))
      setSelectedPin(null)
      if (opts.deletePersonal && target) await deletePersonalCopyOf(target)
    } catch (e) {
      setError(`장소 삭제에 실패했습니다: ${e.message}`)
    }
  }

  // 하단 탭 변경 핸들러
  // 하단 탭의 시트는 한 번에 하나만 연다. 지도 말고 다른 탭을 열면 장소 상세도 닫는다 (시트끼리 겹쳐 보이지 않게)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setShowTeamDrawer(tabId === 'teams')
    setShowListPanel(tabId === 'places')
    setShowFriendPanel(tabId === 'friends')
    setShowNotificationPanel(tabId === 'notifications')
    if (tabId !== 'map') setSelectedPin(null)
    if (tabId === 'notifications') sync.load()
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
                <Star size={12} fill={showOnlyApproved ? 'currentColor' : 'none'} color={showOnlyApproved ? 'currentColor' : 'var(--warning)'} />
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
                    style={isMemberActive ? { borderColor: m.avatarColor } : {}}
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
        {friendLayers.pendingCount > 0 && (
          <button
            className={styles.friendRequestBanner}
            onClick={() => handleTabChange('friends')}
          >
            <Users size={14} />
            <span>친구 요청 {friendLayers.pendingCount}건</span>
            <span className={styles.friendRequestAction}>확인</span>
          </button>
        )}

        {/* 지도 위 레이어가 켜져 있으면 무엇이 겹쳐 있는지 보여준다 */}
        {(visibleFriendOverlays.length > 0 || memberLayer.overlays.length > 0) && (
          <button className={styles.friendOverlayChip} onClick={clearFriendOverlays}>
            <MapPin size={13} />
            <span>
              {visibleFriendOverlays.length > 0
                ? (visibleFriendOverlays.length === 1
                  ? `${visibleFriendOverlays[0].friend.nickname || visibleFriendOverlays[0].friend.loginId}님 지도`
                  : `친구 ${visibleFriendOverlays.length}명 지도`)
                : `모임원 공유 핀 ${memberLayer.pins.length}곳`}
            </span>
            <span className={styles.friendOverlayClose}>끄기</span>
          </button>
        )}

        {/* 이 지도(모임·내 지도)에 보일 장소가 없을 때 안내. 겹쳐 보이는 친구·모임원 핀은 필터와 무관해서 세지 않는다.
            위 배너들과 같은 줄에 쌓아 서로 가리지 않게 한다 */}
        {!routeTarget && filteredPins.length === 0 && (
          <div className={styles.emptyHint} role="status">
            {scopePins.length > 0
              ? '조건에 맞는 장소가 없어요. 필터를 바꿔 보세요'
              : '아직 장소가 없어요. 지도를 누르거나 검색해서 추가해 보세요'}
          </div>
        )}
      </div>

      {/* 지도 레이어 (내 공개 핀·모임원 공유 핀·친구 지도 선택). 내 지도·모임 지도 모두에서 */}
      {(mapScope === 'team' || friendLayers.friends.length > 0 || publicPersonalPins.length > 0) && (
        <button
          className={`${styles.layerBtn} ${(showLayerPanel || visibleFriendOverlays.length > 0 || memberLayer.overlays.length > 0 || showOverlay) ? styles.layerBtnActive : ''} ${(showFriendPanel || showListPanel || showNotificationPanel) ? styles.hideOnNarrow : ''}`}
          onClick={() => setShowLayerPanel(v => !v)}
          aria-pressed={showLayerPanel}
          title="지도 레이어"
        >
          <Layers size={18} />
          {(publicPersonalPins.length + (mapScope === 'team' ? memberLayer.pins.length : 0)) > 0 && (
            <span className={styles.layerCount}>
              {publicPersonalPins.length + (mapScope === 'team' ? memberLayer.pins.length : 0)}
            </span>
          )}
        </button>
      )}

      {/* 성공 안내 배너 */}
      {notice && (
        <div className={styles.noticeFloat} role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className={styles.errorClose}><X size={12} /></button>
        </div>
      )}

      {/* 에러 알림 배너 */}
      {error && (
        <div className={styles.errorFloat}>
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.errorClose}><X size={12} /></button>
        </div>
      )}

      {/* 내 장소 가져오기 (모임 생성·참여 직후, 모임 상세에서) */}
      {importTarget && (
        <ImportPersonalPinsModal
          places={importTarget.places}
          teamName={importTarget.teamName}
          onClose={() => setImportTarget(null)}
          onImport={handleImportPersonalPlaces}
        />
      )}

      {/* 4. 장소 상세 정보 패널 (하단 바텀시트) */}
      {selectedPin && (
        <PinDetailPanel
          pin={selectedPin}
          members={selectedPin?.personal ? [] : members}
          personal={Boolean(selectedPin?.personal)}
          ownerName={selectedPin?.owner}
          overlay={Boolean(selectedPin?.personal) && !selectedPin?.owner && mapScope === 'team'}
          hasPersonalCopy={mapScope === 'team' && personalPins.some(p => isSamePlace(p, selectedPin))}
          onAddToMyMap={selectedPin?.owner ? () => handleAddFriendPinToMyMap(selectedPin) : undefined}
          alreadyAdded={selectedPin?.owner ? personalPins.some(p => isSamePlace(p, selectedPin)) : false}
          onClose={() => setSelectedPin(null)}
          onRecommend={selectedPin?.personal ? undefined : opts => handleRecommend(selectedPin.id, opts)}
          onUpdate={selectedPin?.owner ? undefined : handleUpdatePin}
          onDelete={selectedPin?.owner ? undefined : handleDeletePin}
          onSetVisibility={selectedPin?.personal && !selectedPin?.owner ? visibility => handleSetVisibility(selectedPin.id, visibility) : undefined}
          onUnshare={selectedPin?.personal && !selectedPin?.owner ? () => handleUnshareFromTeam(selectedPin) : undefined}
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

      {/* 5-1-1. 동기화 알림 패널 */}
      {showNotificationPanel && (
        <SyncNotificationPanel
          items={sync.items}
          loading={sync.loading}
          busyId={sync.busyId}
          onApply={sync.apply}
          onIgnore={sync.ignore}
          onApplyAll={sync.applyAll}
          onIgnoreAll={sync.ignoreAll}
          onClose={closeNotificationPanel}
        />
      )}

      {/* 5-2. 지도 레이어 선택 패널 */}
      {showLayerPanel && (
        <LayerPanel
          friends={friendLayers.friends}
          showFriends={mapScope === 'personal'}
          activeFriendIds={visibleFriendOverlays.map(o => o.friend.id)}
          showMine={showOverlay}
          showMineOption={mapScope === 'team'}
          onToggleMine={() => setShowOverlay(v => !v)}
          showMembersOption={mapScope === 'team'}
          showMembers={memberLayer.show}
          memberCount={memberLayer.pins.length}
          onToggleMembers={memberLayer.toggle}
          onSelectFriend={friendLayers.toggle}
          onSelectAll={friendLayers.selectAll}
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
        onImportPersonal={(teamId, teamName) => setImportTarget({ teamId, teamName, places: personalPins })}
        onLeftTeam={handleLeftTeam}
        onClose={() => { setShowTeamDrawer(false); setActiveTab('map'); }}
      />

      {/* 7. 새 모임 생성 모달 */}
      {showCreateTeamModal && (
        <TeamCreateModal
          onClose={createdTeam => {
            setShowCreateTeamModal(false)
            // 생성 모달을 닫으면 내 장소를 가져올지 물어본다
            if (createdTeam && personalPins.length > 0) {
              setImportTarget({ teamId: createdTeam.id, teamName: createdTeam.name, places: personalPins })
            }
          }}
          onCreateTeam={handleCreateTeam}
        />
      )}

      {/* 8. 새 장소 추가 모달 */}
      {showAddPinModal && (
        <AddPinModal
          teamId={selectedTeamId}
          personal={mapScope === 'personal'}
          initialPlace={pickedPlace}
          defaultSyncToPersonal={Boolean(teamDetail?.mySyncToPersonal)}
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
        friendCount={friendLayers.pendingCount}
        notificationCount={sync.pendingCount}
      />
    </div>
  )
}
