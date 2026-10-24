import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Minus, RotateCcw, LocateFixed } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { describeLocation } from '../geocode'
import { fetchRoute } from '../api'
import { searchTransit, loadTransitLines, formatMinutes, WALK_COLOR } from '../transit'
import TransitRoutes from './TransitRoutes'
import OriginInput from './OriginInput'
import { useTransitRealtime } from '../useTransitRealtime'
import { loadKakaoMaps } from '../../../lib/kakaoMaps'
import styles from './MapCanvas.module.css'

// 핀이 하나도 없을 때 보여줄 기본 위치 (서울시청)
const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }

// 카카오는 "level"이 클수록 축소된다 (네이버 zoom과 반대)
const DEFAULT_LEVEL = 5      // 동네 단위
const MY_LOCATION_LEVEL = 3  // 내 주변
const MAX_FIT_LEVEL = 3      // 핀 전체 보기 후 너무 당겨지지 않게
const MIN_LEVEL = 1
const MAX_LEVEL = 14

// 마커 아이콘 기준점: 원형 마커의 중심이 좌표에 오도록
const PIN_ANCHOR = { x: 17, y: 17 }

/**
 * 핀 하나를 나타내는 DOM 요소를 만든다.
 * - HTML 문자열 대신 DOM을 쓰는 이유: 장소명이 사용자 입력이라 문자열 조립 시 이스케이프가 필요해진다
 * - 마커는 React 트리 밖에 붙으므로 CSS Module 클래스명을 직접 넘긴다
 */
function createPinElement({ pin, meta, memberColor, isSelected }) {
  const isGold = Boolean(pin.isAllApproved)

  const wrap = document.createElement('div')
  wrap.className = [styles.pinWrap, isGold && styles.pinWrapGold, isSelected && styles.pinWrapSelected]
    .filter(Boolean)
    .join(' ')
  wrap.title = pin.name

  const body = document.createElement('div')
  body.className = styles.pinBody
  body.style.background = isGold ? '#FFBA08' : meta.color
  body.textContent = meta.icon

  const label = document.createElement('span')
  label.className = styles.pinLabel
  label.textContent = pin.name

  wrap.append(body, label)

  // 추천 수 뱃지 (2명 이상 추천했을 때만)
  const recommendCount = pin.recommenders?.length ?? 0
  if (recommendCount > 1) {
    const badge = document.createElement('span')
    badge.className = styles.pinBadge
    badge.style.background = isGold ? '#FFBA08' : memberColor
    badge.textContent = String(recommendCount)
    wrap.appendChild(badge)
  }

  return wrap
}

/**
 * 카카오 CustomOverlay 는 "요소의 어느 지점이 좌표에 닿는지"를 비율(0~1)로만 받는다.
 * 요소 크기가 글자마다 달라서 비율을 미리 알 수 없으므로,
 * 크기 0인 컨테이너를 두고 그 안에서 (x, y) 픽셀만큼 왼쪽·위로 밀어 기준점을 맞춘다.
 * → 네이버의 `anchor: Point(x, y)` 와 같은 효과
 */
function anchorContent(el, x, y) {
  const wrap = document.createElement('div')
  wrap.style.position = 'relative'
  wrap.style.width = '0'
  wrap.style.height = '0'

  el.style.position = 'absolute'
  el.style.left = `${-x}px`
  el.style.top = `${-y}px`
  wrap.appendChild(el)
  return wrap
}

// 지도에서 고른 위치 마커: 물방울 끝이 좌표에 오도록 (SVG 32x42)
const PICK_ANCHOR = { x: 16, y: 42 }
// 말풍선 윗변이 지도 위쪽에서 이만큼은 떨어지게 한다 (상단 검색바·필터 칩·안내 문구에 가리지 않게)
const PICK_SAFE_TOP = 170
// 이 픽셀 반경 안의 상가를 "누른 상가"로 본다 (지도 라벨 근처를 눌러도 잡히게)
const TAP_RADIUS_PX = 40
// 정적인 SVG라 문자열로 넣는다 (사용자 입력이 섞이지 않음)
const PICK_PIN_SVG = `<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true">
  <path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 41 16 41s15-14.1 15-25.2C31 7.6 24.3 1 16 1z" fill="#6C63FF" stroke="#fff" stroke-width="2"/>
  <circle cx="16" cy="15.5" r="5.5" fill="#fff"/>
</svg>`

/**
 * 지도에서 고른 위치 마커 + 말풍선(상호명, 분류, 주소, 장소 추가 버튼)
 * - 상호명은 describeLocation 이 찾아 주면 채운다 (못 찾으면 주소만)
 */
function createPickedElement({ onAdd, onRoute, onClose }) {
  const wrap = document.createElement('div')
  wrap.className = styles.pickWrap

  const card = document.createElement('div')
  card.className = styles.pickCard
  // 말풍선 안에서 누르거나 끌어도 지도 클릭으로 이어져 마커가 옮겨지지 않게 막는다
  for (const type of ['mousedown', 'pointerdown', 'touchstart', 'click', 'dblclick']) {
    card.addEventListener(type, e => e.stopPropagation())
  }

  const close = document.createElement('button')
  close.type = 'button'
  close.className = styles.pickClose
  close.setAttribute('aria-label', '선택 해제')
  close.textContent = '×'
  close.addEventListener('click', onClose)

  const title = document.createElement('strong')
  title.className = styles.pickTitle
  title.hidden = true

  const category = document.createElement('span')
  category.className = styles.pickCategory
  category.hidden = true

  const address = document.createElement('p')
  address.className = styles.pickAddress
  address.textContent = '장소 확인 중…'

  const route = document.createElement('button')
  route.type = 'button'
  route.className = styles.pickRoute
  route.textContent = '길찾기'
  route.addEventListener('click', onRoute)

  const add = document.createElement('button')
  add.type = 'button'
  add.className = styles.pickAdd
  add.textContent = '장소 추가'
  add.addEventListener('click', onAdd)

  const actions = document.createElement('div')
  actions.className = styles.pickActions
  actions.append(route, add)

  card.append(close, title, category, address, actions)

  const pin = document.createElement('div')
  pin.className = styles.pickPin
  pin.innerHTML = PICK_PIN_SVG

  wrap.append(card, pin)
  const setInfo = ({ name, category: categoryText, address: addressText }) => {
    title.textContent = name || ''
    title.hidden = !name
    // "음식점>카페,디저트" 처럼 오므로 마지막 단계만 보여준다
    category.textContent = categoryText ? categoryText.split('>').pop() : ''
    category.hidden = !categoryText
    address.textContent = addressText || '주소를 확인하지 못했습니다'
  }
  return { el: wrap, card, setInfo }
}

// 위치 조회에 걸리는 최대 시간 (권한 팝업에 응답할 시간을 넉넉히 준다)
const LOCATION_TIMEOUT = 10000
// 지도 첫 표시를 이만큼까지 기다린다 (권한 응답이 없으면 서울로 먼저 띄우고 나중에 이동)
const FIRST_PAINT_WAIT = 5000

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// GeolocationPositionError.code → 사용자에게 보여줄 문구
const LOCATION_ERROR_MESSAGE = {
  1: '위치 권한이 거부되었습니다. 주소창의 자물쇠 아이콘에서 허용으로 바꿔주세요.',
  2: '현재 위치를 확인할 수 없습니다. 윈도우 설정의 위치 서비스가 꺼져 있는지 확인해 주세요.',
  3: '위치 확인이 지연되고 있습니다. 권한 팝업에서 허용을 눌렀는지 확인해 주세요.',
}

const locationErrorMessage = code =>
  LOCATION_ERROR_MESSAGE[code] ?? '현재 위치를 확인하지 못했습니다.'

/**
 * 현재 위치를 구한다. 실패해도 reject하지 않고 결과를 담아 돌려준다.
 * - 첫 진입에는 highAccuracy를 끈다. 켜면 GPS 탐색 때문에 수 초가 걸려 첫 화면이 늦어진다.
 * - 도시 단위 정확도면 지도 중심을 잡기에 충분하다.
 * @returns {Promise<{ok: true, lat: number, lng: number} | {ok: false, code: number|string}>}
 */
function getMyLocation(highAccuracy = false) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ ok: false, code: 'UNSUPPORTED' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ ok: true, lat: coords.latitude, lng: coords.longitude }),
      error => resolve({ ok: false, code: error.code }),
      { enableHighAccuracy: highAccuracy, timeout: LOCATION_TIMEOUT, maximumAge: 60000 }
    )
  })
}

/** 현재 위치를 나타내는 파란 점 마커를 만든다 */
function createMyLocationMarker(maps, map, position) {
  const dot = document.createElement('div')
  dot.className = styles.myLocationDot
  return new maps.CustomOverlay({
    position,
    content: anchorContent(dot, 9, 9),
    map,
    zIndex: 200,
  })
}

/** 핀 마커(오버레이)를 만든다 */
function createPinOverlay(maps, map, { pin, meta, memberColor, isSelected }) {
  return new maps.CustomOverlay({
    position: new maps.LatLng(pin.lat, pin.lng),
    content: anchorContent(
      createPinElement({ pin, meta, memberColor, isSelected }),
      PIN_ANCHOR.x,
      PIN_ANCHOR.y
    ),
    map,
    zIndex: isSelected ? 100 : pin.isAllApproved ? 50 : 10,
    // 기본값(false)이면 클릭이 지도로 통과해 핀을 눌러도 "위치 고르기"가 같이 뜬다
    clickable: true,
  })
}

/**
 * 카카오 지도 기반 지도 컴포넌트
 * - 지도 생성·이동·줌은 SDK에 맡기고, 이 컴포넌트는 핀(오버레이)만 그린다
 * - props: pins(필터링된 핀), members(멤버 색상 조회용), onSelectPin, selectedPin,
 *          onAddAtLocation(지도에서 고른 위치로 장소 추가: { name, address, lat, lng }),
 *          onRouteTo(지도에서 고른 장소로 길찾기: { name, lat, lng })
 */
export default function MapCanvas({ pins, members, onSelectPin, selectedPin, onAddAtLocation, onRouteTo, routeTarget, onClearRoute }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map()) // pinId -> { marker, pin, meta, memberColor }
  const onSelectRef = useRef(onSelectPin)
  const myLocationRef = useRef(null) // 현재 위치 좌표
  const myLocationMarkerRef = useRef(null) // 현재 위치 마커
  const pickedMarkerRef = useRef(null) // 지도에서 고른 위치 마커
  const selectedPinRef = useRef(selectedPin)
  const onAddAtLocationRef = useRef(onAddAtLocation)
  const onRouteToRef = useRef(onRouteTo)
  const routeLinesRef = useRef([]) // 길찾기 경로 선들 (대중교통은 구간마다 한 줄)
  const routePanelRef = useRef(null) // 경로를 화면에 맞출 때 패널 높이만큼 위를 비운다
  const transitLinesCache = useRef(new Map()) // mapObj -> 노선 모양 (후보를 다시 고를 때 재요청하지 않게)
  const walkPathCache = useRef(new Map()) // 'lat,lng>lat,lng' -> 실제 도보 경로 (대중교통 안의 도보 구간)
  const [transit, setTransit] = useState(null) // { options, index, origin, dest }
  const { arrivals, buses, subway } = useTransitRealtime(transit) // 실시간 도착·버스 위치(TAGO), 지하철 다음 열차
  const busMarkersRef = useRef([])
  const [route, setRoute] = useState(null) // { name, distance, duration } | { name, loading: true }
  const [routeMode, setRouteMode] = useState('car') // 마지막으로 고른 이동 수단을 다음 길찾기에도 쓴다
  const [routeOrigin, setRouteOrigin] = useState(null) // { name, lat, lng, mine } | null (null 이면 직접 입력해야 함)
  const [originLocating, setOriginLocating] = useState(false)
  const [originNote, setOriginNote] = useState('') // 출발지가 비어 있는 이유 (위치 권한 등)
  const [status, setStatus] = useState('loading') // loading | ready | nokey | error
  const [errorMessage, setErrorMessage] = useState('')
  const [locateError, setLocateError] = useState('')
  const [locating, setLocating] = useState(false) // 위치 조회 중 표시

  // 지도 이벤트는 한 번만 등록되므로 최신 콜백을 ref로 참조한다
  useEffect(() => {
    onSelectRef.current = onSelectPin
    selectedPinRef.current = selectedPin
    onAddAtLocationRef.current = onAddAtLocation
    onRouteToRef.current = onRouteTo
  }, [onSelectPin, selectedPin, onAddAtLocation, onRouteTo])

  const clearPick = useCallback(() => {
    pickedMarkerRef.current?.setMap(null)
    pickedMarkerRef.current = null
  }, [])

  // 지도 빈 곳을 누르면 그 자리에 우리 마커를 찍고 주소를 붙인다
  const pickLocation = useCallback((maps, map, coord) => {
    clearPick()
    let place = { name: '', address: '', lat: coord.getLat(), lng: coord.getLng() }
    const { el, card, setInfo } = createPickedElement({
      onAdd: () => {
        onAddAtLocationRef.current?.({ ...place, name: place.name || place.address })
        clearPick()
      },
      onRoute: () => {
        onRouteToRef.current?.({ name: place.name || place.address || '선택한 위치', lat: place.lat, lng: place.lng })
        clearPick()
      },
      onClose: clearPick,
    })
    const marker = new maps.CustomOverlay({
      position: coord,
      content: anchorContent(el, PICK_ANCHOR.x, PICK_ANCHOR.y),
      map,
      zIndex: 300,
      clickable: true,
    })
    pickedMarkerRef.current = marker

    const isCurrent = () => pickedMarkerRef.current === marker // 그 사이 다른 곳을 골랐으면 무시
    // 손가락 범위를 지금 줌의 미터로 바꾼다 (확대하면 좁게, 축소하면 넓게)
    const bounds = map.getBounds()
    const height = containerRef.current?.clientHeight || 1
    const metersPerPx =
      ((bounds.getNorthEast().getLat() - bounds.getSouthWest().getLat()) * 111_320) / height
    const tapMeters = Math.min(80, Math.max(10, TAP_RADIUS_PX * metersPerPx))

    describeLocation(place.lat, place.lng, { tapMeters })
      .then(info => {
        if (!isCurrent()) return
        place = { name: info.name || '', address: info.address || '', lat: info.lat, lng: info.lng }
        setInfo(info)
        // 상가를 찾았으면 마커를 그 상가 좌표로 옮긴다 (못 찾았으면 같은 자리)
        marker.setPosition(new maps.LatLng(info.lat, info.lng))
        // 내용이 채워져 높이가 정해진 뒤 실제 화면 위치를 재서, 위쪽 UI에 가리면 그만큼 지도를 내린다
        requestAnimationFrame(() => {
          const container = containerRef.current
          if (!container) return
          const top = card.getBoundingClientRect().top - container.getBoundingClientRect().top
          if (top < PICK_SAFE_TOP) map.panBy(0, top - PICK_SAFE_TOP)
        })
      })
      .catch(() => {
        if (isCurrent()) setInfo({ name: null, category: '', address: null })
      })
  }, [clearPick])

  // 1) 지도 생성 (마운트 시 1회)
  useEffect(() => {
    let cancelled = false
    let resizeObserver = null

    // 위치 조회와 SDK 로드를 동시에 시작한다 (순서대로 하면 체감 대기가 두 배가 된다)
    const locationPromise = getMyLocation()

    Promise.all([loadKakaoMaps(), Promise.race([locationPromise, wait(FIRST_PAINT_WAIT).then(() => null)])])
      .then(([maps, firstResult]) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const el = containerRef.current
        el.style.width = '100%'
        el.style.height = '100%'

        // 위치를 이미 알고 있으면 처음부터 그 자리에서 지도를 만든다 (서울로 떴다가 튀는 현상 방지)
        const firstLocation = firstResult?.ok ? firstResult : null
        const center = firstLocation ?? SEOUL_CENTER

        const map = new maps.Map(el, {
          center: new maps.LatLng(center.lat, center.lng),
          level: firstLocation ? MY_LOCATION_LEVEL : DEFAULT_LEVEL,
        })

        mapRef.current = map
        maps.event.addListener(map, 'click', e => {
          // 핀 상세가 열려 있으면 첫 클릭은 닫기만 한다
          if (selectedPinRef.current) {
            onSelectRef.current(null)
            return
          }
          pickLocation(maps, map, e.latLng)
        })
        setStatus('ready')

        // 컨테이너 크기가 바뀌면(패널 열림 등) 지도를 다시 그린다
        resizeObserver = new ResizeObserver(() => {
          const target = containerRef.current
          if (!target) return
          if (target.clientWidth > 0 && target.clientHeight > 0) map.relayout()
        })
        resizeObserver.observe(el)

        // 이미 위치를 알고 있으면 파란 점만 찍는다 (중심은 위에서 이미 잡았다)
        if (firstLocation) {
          const here = new maps.LatLng(firstLocation.lat, firstLocation.lng)
          myLocationRef.current = here
          myLocationMarkerRef.current = createMyLocationMarker(maps, map, here)
          return
        }

        // 위치를 못 받았으면 이유를 화면에 남긴다 (조용히 서울로 대체하지 않는다)
        setLocateError(
          firstResult
            ? locationErrorMessage(firstResult.code)
            : '위치 확인이 지연되어 서울에서 시작합니다. 우측 하단 버튼으로 다시 시도할 수 있어요.'
        )

        // 권한 응답이 늦게 오면 그때 부드럽게 내 위치로 이동한다
        locationPromise.then(result => {
          if (cancelled) return
          if (!result?.ok) {
            setLocateError(locationErrorMessage(result?.code))
            return
          }
          const here = new maps.LatLng(result.lat, result.lng)
          myLocationRef.current = here
          map.setLevel(MY_LOCATION_LEVEL)
          map.panTo(here)
          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setPosition(here)
          } else {
            myLocationMarkerRef.current = createMyLocationMarker(maps, map, here)
          }
          setLocateError('')
        })
      })
      .catch(error => {
        if (cancelled) return
        setStatus(error.code === 'NO_KEY' ? 'nokey' : 'error')
        setErrorMessage(error.message)
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      markersRef.current.clear()
      pickedMarkerRef.current = null
      myLocationMarkerRef.current = null
      mapRef.current = null
      // SDK가 남긴 DOM 정리 (StrictMode 재마운트 대비)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [pickLocation])

  // 2) 핀 목록이 바뀌면 마커를 다시 만든다
  useEffect(() => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map || status !== 'ready') return

    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current.clear()

    pins.forEach(pin => {
      const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
      const memberColor = members.find(m => m.id === pin.addedBy)?.avatarColor ?? meta.color

      const marker = createPinOverlay(maps, map, { pin, meta, memberColor, isSelected: false })
      // 오버레이는 DOM이라 클릭 리스너를 요소에 직접 건다
      marker.getContent().firstChild.addEventListener('click', () => onSelectRef.current(pin))
      markersRef.current.set(pin.id, { marker, pin, meta, memberColor })
    })
  }, [pins, members, status])

  // 3) 선택된 핀의 강조 표시만 갱신한다 (마커를 다시 만들지 않음)
  useEffect(() => {
    const maps = window.kakao?.maps
    if (!maps) return

    markersRef.current.forEach((entry, pinId) => {
      const isSelected = selectedPin?.id === pinId
      entry.marker.setContent(
        anchorContent(
          createPinElement({ ...entry, isSelected }),
          PIN_ANCHOR.x,
          PIN_ANCHOR.y
        )
      )
      entry.marker.getContent().firstChild.addEventListener('click', () => onSelectRef.current(entry.pin))
      entry.marker.setZIndex(isSelected ? 100 : entry.pin.isAllApproved ? 50 : 10)
    })
  }, [selectedPin, pins, members])

  // 4) 핀 전체 보기는 우측 하단 버튼(resetView)으로만 한다.
  //    첫 진입은 항상 내 위치(없으면 서울)로 열어야 해서 자동 fitBounds 는 하지 않는다.

  // 5) 목록 패널 등에서 고른 핀이 화면 밖이면 그쪽으로 이동
  useEffect(() => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map || !selectedPin) return

    clearPick() // 핀을 고르면 지도에서 고른 위치 표시는 지운다
    const position = new maps.LatLng(selectedPin.lat, selectedPin.lng)
    if (!map.getBounds().contain(position)) map.panTo(position)
  }, [selectedPin, clearPick])

  const clearRouteLines = useCallback(() => {
    routeLinesRef.current.forEach(line => line.setMap(null))
    routeLinesRef.current = []
  }, [])

  // 경로 선들을 그리고 화면에 맞춘다. lines: [{ path: [[lat, lng]], color, style }]
  const drawRouteLines = useCallback((lines) => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map) return
    clearRouteLines()
    const bounds = new maps.LatLngBounds()
    routeLinesRef.current = lines.map(({ path, color, style }) => {
      const points = path.map(([lat, lng]) => new maps.LatLng(lat, lng))
      points.forEach(point => bounds.extend(point))
      return new maps.Polyline({
        map,
        path: points,
        strokeWeight: style === 'shortdash' ? 5 : 6,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeStyle: style,
      })
    })
    // 위쪽 길찾기 패널·아래쪽 컨트롤에 가리지 않게 여백을 둔다 (상, 우, 하, 좌). 패널은 대중교통 목록이면 길어진다
    const panelBottom = routePanelRef.current?.getBoundingClientRect().bottom ?? 0
    const mapTop = containerRef.current?.getBoundingClientRect().top ?? 0
    const top = Math.max(180, panelBottom - mapTop + 24)
    if (routeLinesRef.current.length) map.setBounds(bounds, top, 40, 120, 40)
  }, [clearRouteLines])

  // 내 위치를 출발지로. 위치를 못 받으면 출발지를 비우고 이유를 남긴다 (직접 입력하게)
  const locateOrigin = useCallback(async () => {
    const maps = window.kakao?.maps
    setOriginLocating(true)
    let here = myLocationRef.current
    if (!here) {
      const result = await getMyLocation(true)
      if (result.ok && maps) {
        here = new maps.LatLng(result.lat, result.lng)
        myLocationRef.current = here
      } else {
        setOriginNote(result.ok ? '' : `${locationErrorMessage(result.code).split('.')[0]} · 출발지를 입력하세요`)
      }
    }
    setOriginLocating(false)
    if (here) {
      setOriginNote('')
      setRouteOrigin({ name: '내 위치', lat: here.getLat(), lng: here.getLng(), mine: true })
    } else {
      setRouteOrigin(null)
    }
  }, [])

  // 새 목적지로 길찾기를 시작하면 출발지는 내 위치부터 시도한다
  useEffect(() => {
    setRouteOrigin(null)
    setOriginNote('')
    if (routeTarget && status === 'ready') locateOrigin()
  }, [routeTarget, status, locateOrigin])

  // 6) 길찾기: 출발지 → routeTarget 까지 routeMode 경로를 찾는다. routeTarget 이 없어지면 지운다
  useEffect(() => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    clearRouteLines()
    setRoute(null)
    setTransit(null)
    if (!maps || !map || !routeTarget || status !== 'ready') return
    if (!routeOrigin) {
      // 출발지를 아직 모르거나(위치 확인 중) 직접 입력해야 한다
      setRoute({ name: routeTarget.name, needOrigin: true })
      return
    }

    let cancelled = false
    setRoute({ name: routeTarget.name, loading: true })

    const run = async () => {
      const from = { lat: routeOrigin.lat, lng: routeOrigin.lng }
      const to = { lat: routeTarget.lat, lng: routeTarget.lng }

      if (routeMode === 'transit') {
        const options = await searchTransit(from, to)
        if (cancelled) return
        if (options.length === 0) throw new Error('대중교통 경로를 찾지 못했어요.')
        setTransit({ options, index: 0, origin: from, dest: to }) // 선은 아래 7) 에서 그린다
        setRoute({ name: routeTarget.name, transit: true })
        return
      }

      const data = await fetchRoute(from, to, routeMode)
      if (cancelled) return
      drawRouteLines([{ path: data.path, color: ROUTE_MODES[routeMode].color, style: ROUTE_MODES[routeMode].strokeStyle }])
      setRoute({ name: routeTarget.name, distance: data.distance, duration: data.duration, estimated: Boolean(data.estimated) })
    }

    run().catch(error => {
      if (cancelled) return
      // 패널은 남겨 두고 안에 오류를 보여준다 (다른 이동 수단으로 바꿀 수 있게)
      setRoute({ name: routeTarget.name, error: error.message || '길찾기에 실패했습니다.' })
    })

    return () => {
      cancelled = true
    }
  }, [routeTarget, routeOrigin, status, routeMode, clearRouteLines, drawRouteLines])

  // 대중교통 안의 도보 구간 실제 경로. 아주 가깝거나(같은 정류장 환승 등) 실패하면 직선으로 대신한다
  const walkPath = useCallback(async (from, to) => {
    const straight = [[from.lat, from.lng], [to.lat, to.lng]]
    if (distanceMeters(from, to) < WALK_PATH_MIN_METERS) return straight
    const key = `${from.lat},${from.lng}>${to.lat},${to.lng}`
    const cache = walkPathCache.current
    if (!cache.has(key)) {
      cache.set(key, fetchRoute(from, to, 'walk').then(data => data.path).catch(() => {
        cache.delete(key)
        return straight
      }))
    }
    return cache.get(key)
  }, [])

  // 7) 대중교통: 버스·지하철은 노선 색 실제 모양, 도보·환승 구간은 실제 걷는 길(TMAP)을 도보 색 점선으로 그린다
  useEffect(() => {
    if (!transit) return
    const option = transit.options[transit.index]
    let cancelled = false

    const cache = transitLinesCache.current
    const load = cache.has(option.mapObj)
      ? Promise.resolve(cache.get(option.mapObj))
      : loadTransitLines(option.mapObj).then(lines => {
          cache.set(option.mapObj, lines)
          return lines
        })

    const rides = option.legs.filter(leg => leg.kind !== 'walk')
    // 출발 → 첫 승차, 하차 → 다음 승차(환승), 마지막 하차 → 도착
    const stops = [transit.origin, ...rides.flatMap(leg => [leg.start, leg.end]), transit.dest]
    const walkPairs = []
    for (let i = 0; i + 1 < stops.length; i += 2) walkPairs.push([stops[i], stops[i + 1]])

    Promise.all([load, Promise.all(walkPairs.map(([from, to]) => walkPath(from, to)))])
      .then(([lines, walks]) => {
        if (cancelled) return
        // 탈것 노선을 나중에 그려서 위에 오게 한다
        drawRouteLines([
          ...walks.map(path => ({ path, color: WALK_COLOR, style: 'shortdash' })),
          ...lines.map(line => ({ ...line, style: 'solid' })),
        ])
      })
      .catch(error => {
        if (!cancelled) setRoute(prev => (prev ? { ...prev, error: error.message } : prev))
      })

    return () => {
      cancelled = true
    }
  }, [transit, drawRouteLines, walkPath])

  // 8) 고른 대중교통 후보의 실시간 버스 위치를 그린다 (갱신마다 다시 그림)
  useEffect(() => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    busMarkersRef.current.forEach(marker => marker.setMap(null))
    busMarkersRef.current = []
    if (!maps || !map || !transit) return

    busMarkersRef.current = buses.map(bus => {
      const el = document.createElement('div')
      el.className = styles.busMarker
      el.style.background = bus.color
      el.textContent = `🚌 ${bus.name}`
      el.title = `${bus.name}번 ${bus.vehicleNo} · ${bus.nodeName} 부근`
      return new maps.CustomOverlay({
        position: new maps.LatLng(bus.lat, bus.lng),
        content: anchorContent(el, 0, 0),
        map,
        zIndex: 150,
      })
    })
  }, [buses, transit])

  const moveToMyLocation = useCallback(async (level = MY_LOCATION_LEVEL) => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map) return

    setLocating(true)
    const result = await getMyLocation(true)
    setLocating(false)

    if (!result.ok) {
      setLocateError(locationErrorMessage(result.code))
      return
    }

    setLocateError('')
    const here = new maps.LatLng(result.lat, result.lng)
    myLocationRef.current = here
    map.setLevel(level)
    map.panTo(here)

    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.setPosition(here)
    } else {
      myLocationMarkerRef.current = createMyLocationMarker(maps, map, here)
    }
  }, [])

  // 위치 안내 문구는 3초 뒤 자동으로 사라진다
  useEffect(() => {
    if (!locateError) return
    const timer = setTimeout(() => setLocateError(''), 3000)
    return () => clearTimeout(timer)
  }, [locateError])

  // 카카오는 레벨이 작을수록 확대다 (네이버 zoom 과 반대 방향)
  const changeZoom = delta => {
    const map = mapRef.current
    if (!map) return
    const next = map.getLevel() - delta
    map.setLevel(Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, next)))
  }

  const resetView = () => {
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map) return

    if (pins.length === 0) {
      // 보여줄 핀이 없으면 내 위치로 돌아간다
      moveToMyLocation()
      return
    }

    const bounds = new maps.LatLngBounds()
    pins.forEach(pin => bounds.extend(new maps.LatLng(pin.lat, pin.lng)))
    map.setBounds(bounds)
    if (map.getLevel() < MAX_FIT_LEVEL) map.setLevel(MAX_FIT_LEVEL)
  }

  return (
    <div className={styles.mapRoot}>
      <div ref={containerRef} className={styles.mapContainer} />

      {status === 'loading' && (
        <div className={styles.overlay}>
          <p className={styles.overlayText}>지도를 불러오는 중…</p>
        </div>
      )}

      {(status === 'nokey' || status === 'error') && (
        <div className={styles.overlay}>
          <div className={styles.notice}>
            <strong className={styles.noticeTitle}>
              {status === 'nokey' ? '카카오 지도 키가 없습니다' : '지도를 표시하지 못했습니다'}
            </strong>
            <p className={styles.noticeText}>{errorMessage}</p>
            <p className={styles.noticeMeta}>현재 접속 주소: {window.location.origin}</p>
            {status === 'nokey' && (
              <ol className={styles.noticeList}>
                <li>카카오 콘솔 → 내 애플리케이션 → 앱 선택 → 플랫폼 키</li>
                <li>
                  <code>frontend/.env</code>에 <code>VITE_KAKAO_MAP_KEY=JavaScript키</code> 추가
                </li>
                <li>
                  JavaScript SDK 도메인에 <code>http://localhost:5173</code> 등록
                </li>
                <li>개발 서버 재시작</li>
              </ol>
            )}
          </div>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className={styles.controlStack}>
            {/* 지도 위에 떠 있는 원형 내 위치 버튼 */}
            <button
              className={styles.locateBtn}
              onClick={() => moveToMyLocation()}
              title="내 위치로 이동"
              aria-label="내 위치로 이동"
              disabled={locating}
            >
              <LocateFixed size={18} />
            </button>

            <div className={styles.controls}>
              <button className={styles.controlBtn} onClick={() => changeZoom(1)} title="확대">
                <Plus size={16} />
              </button>
              <button className={styles.controlBtn} onClick={() => changeZoom(-1)} title="축소">
                <Minus size={16} />
              </button>
              <div className={styles.controlDivider} />
              <button className={styles.controlBtn} onClick={resetView} title="핀 전체 보기">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {route && (
            <div className={styles.routePanel} ref={routePanelRef}>
              <div className={styles.routeHeader}>
                <div className={styles.routeEnds}>
                  <div className={styles.routeEnd}>
                    <span className={styles.routeEndLabel}>출발</span>
                    <OriginInput
                      value={routeOrigin}
                      onChange={setRouteOrigin}
                      onUseMyLocation={locateOrigin}
                      locating={originLocating}
                      note={originLocating ? '내 위치 확인 중…' : originNote}
                    />
                  </div>
                  <div className={styles.routeEnd}>
                    <span className={styles.routeEndLabel}>도착</span>
                    <span className={styles.routeName}>{route.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.routeClose}
                  onClick={() => onClearRoute?.()}
                  aria-label="길찾기 닫기"
                >
                  ×
                </button>
              </div>
              <div className={styles.routeBody}>
                <div className={styles.routeTabs} role="tablist" aria-label="이동 수단">
                  {Object.entries(ROUTE_MODES).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={routeMode === key}
                      className={`${styles.routeTab} ${routeMode === key ? styles.routeTabActive : ''}`}
                      style={{ '--mode-color': meta.color ?? 'var(--primary)' }}
                      onClick={() => setRouteMode(key)}
                      title={meta.label}
                    >
                      {/* 지도 선 색과 같은 점 (범례 역할) */}
                      <span className={styles.modeDot} aria-hidden="true" />
                      <span aria-hidden="true">{meta.icon}</span>
                      {meta.label}
                    </button>
                  ))}
                </div>
                <span className={styles.routeInfo} role="status">
                  {route.needOrigin
                    ? ''
                    : route.loading
                    ? '경로 찾는 중…'
                    : route.error
                      ? ''
                      : route.transit && transit
                        ? `${formatMinutes(transit.options[transit.index].totalMinutes)} · ${transit.options[transit.index].payment.toLocaleString()}원`
                        : `${formatDistance(route.distance)} · ${formatDuration(route.duration)}${route.estimated ? ' (추정)' : ''}`}
                </span>
              </div>
              {route.error && <p className={styles.routeError} role="alert">{route.error}</p>}
              {route.transit && transit && (
                <TransitRoutes
                  options={transit.options}
                  arrivals={arrivals}
                  subway={subway}
                  originName={routeOrigin?.name}
                  destName={route.name}
                  selectedIndex={transit.index}
                  onSelect={index => setTransit(prev => ({ ...prev, index }))}
                />
              )}
            </div>
          )}

          {!route && pins.length === 0 && (
            <div className={styles.emptyHint}>아직 등록된 장소가 없습니다 · 우측 상단에서 장소를 추가해 보세요</div>
          )}

          {locateError && <div className={styles.locateError}>{locateError}</div>}
        </>
      )}
    </div>
  )
}

const formatDistance = meters => (meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`)

const formatDuration = seconds => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`
}

// 이동 수단 탭. 자동차·도보는 백엔드(/api/route), 대중교통은 ODsay(프론트)
// color 는 지도 선 색이자 탭의 점 색. 대중교통은 노선마다 색이 달라 대표색(버스 파랑)만 둔다
const ROUTE_MODES = {
  car: { label: '자동차', icon: '🚗', color: '#6C63FF', strokeStyle: 'solid' },
  walk: { label: '도보', icon: '🚶', color: WALK_COLOR, strokeStyle: 'shortdash' },
  bike: { label: '자전거', icon: '🚲', color: '#F97316', strokeStyle: 'solid' },
  transit: { label: '대중교통', icon: '🚌', color: '#3D5BAB', strokeStyle: 'solid' },
}

// 이보다 짧은 도보 구간은 경로 API 를 부르지 않고 직선으로 그린다
const WALK_PATH_MIN_METERS = 40

// 수백 m 범위라 평면 근사로 충분하다
function distanceMeters(a, b) {
  const dy = (b.lat - a.lat) * 111_320
  const dx = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

