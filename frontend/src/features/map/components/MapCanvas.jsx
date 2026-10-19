import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Minus, RotateCcw, LocateFixed } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { loadNaverMaps, onNaverMapAuthFailure } from '../../../lib/naverMaps'
import styles from './MapCanvas.module.css'

// 핀이 하나도 없을 때 보여줄 기본 위치 (서울시청)
const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }
const DEFAULT_ZOOM = 14
const SINGLE_PIN_ZOOM = 16
const MAX_FIT_ZOOM = 16
const MY_LOCATION_ZOOM = 16

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

// 위치 조회에 걸리는 최대 시간
const LOCATION_TIMEOUT = 4000
// 지도 첫 표시를 이만큼까지 기다린다 (권한 응답이 없으면 서울로 먼저 띄우고 나중에 이동)
const FIRST_PAINT_WAIT = 5000

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 현재 위치를 구한다. 실패(거부·시간초과·미지원)해도 reject하지 않고 null을 준다.
 * - 첫 진입에는 highAccuracy를 끈다. 켜면 GPS 탐색 때문에 수 초가 걸려 첫 화면이 늦어진다.
 * - 도시 단위 정확도면 지도 중심을 잡기에 충분하다.
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
function getMyLocation(highAccuracy = false) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout: LOCATION_TIMEOUT, maximumAge: 60000 }
    )
  })
}

/** 현재 위치를 나타내는 파란 점 마커를 만든다 */
function createMyLocationMarker(maps, map, position) {
  const dot = document.createElement('div')
  dot.className = styles.myLocationDot
  return new maps.Marker({
    position,
    map,
    icon: { content: dot, anchor: new maps.Point(9, 9) },
    zIndex: 200,
  })
}

/**
 * 네이버 지도 기반 지도 컴포넌트
 * - 지도 생성·이동·줌은 SDK에 맡기고, 이 컴포넌트는 핀(마커)만 그린다
 * - props: pins(필터링된 핀), members(멤버 색상 조회용), onSelectPin, selectedPin
 */
export default function MapCanvas({ pins, members, onSelectPin, selectedPin }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map()) // pinId -> { marker, pin, meta, memberColor }
  const onSelectRef = useRef(onSelectPin)
  const hasFitRef = useRef(false) // 최초 1회만 전체 보기
  const myLocationRef = useRef(null) // 현재 위치 좌표
  const myLocationMarkerRef = useRef(null) // 현재 위치 마커
  const pinsRef = useRef(pins) // 위치가 늦게 도착했을 때 핀을 덮지 않도록 확인용
  const [status, setStatus] = useState('loading') // loading | ready | nokey | error
  const [errorMessage, setErrorMessage] = useState('')
  const [locateError, setLocateError] = useState('')
  const [locating, setLocating] = useState(false) // 위치 조회 중 표시

  // 지도 이벤트는 한 번만 등록되므로 최신 콜백을 ref로 참조한다
  useEffect(() => {
    onSelectRef.current = onSelectPin
  }, [onSelectPin])

  // 인증 실패는 지도가 뜬 뒤에 통지될 수 있다 (도메인 미등록 등)
  useEffect(
    () =>
      onNaverMapAuthFailure(error => {
        setStatus('error')
        setErrorMessage(error.message)
      }),
    []
  )

  // 1) 지도 생성 (마운트 시 1회)
  useEffect(() => {
    let cancelled = false
    let resizeObserver = null

    // 위치 조회와 SDK 로드를 동시에 시작한다 (순서대로 하면 체감 대기가 두 배가 된다)
    const locationPromise = getMyLocation()

    Promise.all([loadNaverMaps(), Promise.race([locationPromise, wait(FIRST_PAINT_WAIT).then(() => null)])])
      .then(([maps, firstLocation]) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const el = containerRef.current
        el.style.width = '100%'
        el.style.height = '100%'

        // 위치를 이미 알고 있으면 처음부터 그 자리에서 지도를 만든다 (서울로 떴다가 튀는 현상 방지)
        const center = firstLocation ?? SEOUL_CENTER

        const map = new maps.Map(el, {
          center: new maps.LatLng(center.lat, center.lng),
          zoom: firstLocation ? MY_LOCATION_ZOOM : DEFAULT_ZOOM,
          minZoom: 6,
          maxZoom: 21,
          size: new maps.Size(el.clientWidth, el.clientHeight),
          zoomControl: false, // 컨트롤은 아래에서 직접 그린다
          mapTypeControl: false,
          scaleControl: false,
          // 지도 로고(좌하단)와 데이터 출처(우하단)는 약관상 유지해야 하므로 기본값 그대로 둔다
          logoControl: true,
          mapDataControl: true,
        })

        mapRef.current = map
        maps.Event.addListener(map, 'click', () => onSelectRef.current(null))
        setStatus('ready')

        // 컨테이너 크기가 바뀌면(패널 열림 등) 지도를 다시 그린다
        resizeObserver = new ResizeObserver(() => {
          const e = containerRef.current
          if (!e) return
          const width = e.clientWidth
          const height = e.clientHeight
          if (width > 0 && height > 0) {
            map.setSize(new maps.Size(width, height))
          }
        })
        resizeObserver.observe(el)

        // 이미 위치를 알고 있으면 파란 점만 찍는다 (중심은 위에서 이미 잡았다)
        if (firstLocation) {
          const here = new maps.LatLng(firstLocation.lat, firstLocation.lng)
          myLocationRef.current = here
          myLocationMarkerRef.current = createMyLocationMarker(maps, map, here)
          return
        }

        // 권한 응답이 늦게 오면 그때 부드럽게 이동한다 (팀 핀이 있으면 핀 우선)
        locationPromise.then(position => {
          if (cancelled || !position || pinsRef.current.length > 0) return
          const here = new maps.LatLng(position.lat, position.lng)
          myLocationRef.current = here
          map.morph(here, MY_LOCATION_ZOOM)
          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setPosition(here)
          } else {
            myLocationMarkerRef.current = createMyLocationMarker(maps, map, here)
          }
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
      mapRef.current?.destroy?.()
      mapRef.current = null
      // SDK가 남긴 DOM 정리 (StrictMode 재마운트 대비)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  // 2) 핀 목록이 바뀌면 마커를 다시 만든다
  useEffect(() => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map || status !== 'ready') return

    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current.clear()

    pins.forEach(pin => {
      const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
      const memberColor = members.find(m => m.id === pin.addedBy)?.avatarColor ?? meta.color

      const marker = new maps.Marker({
        position: new maps.LatLng(pin.lat, pin.lng),
        map,
        title: pin.name,
        zIndex: pin.isAllApproved ? 50 : 10,
        icon: {
          content: createPinElement({ pin, meta, memberColor, isSelected: false }),
          anchor: new maps.Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
        },
      })

      maps.Event.addListener(marker, 'click', () => onSelectRef.current(pin))
      markersRef.current.set(pin.id, { marker, pin, meta, memberColor })
    })
  }, [pins, members, status])

  // 3) 선택된 핀의 강조 표시만 갱신한다 (마커를 다시 만들지 않음)
  useEffect(() => {
    const maps = window.naver?.maps
    if (!maps) return

    markersRef.current.forEach((entry, pinId) => {
      const isSelected = selectedPin?.id === pinId
      entry.marker.setIcon({
        content: createPinElement({ ...entry, isSelected }),
        anchor: new maps.Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
      })
      entry.marker.setZIndex(isSelected ? 100 : entry.pin.isAllApproved ? 50 : 10)
    })
  }, [selectedPin, pins, members])

  // 4) 핀이 처음 들어왔을 때 전체가 보이도록 한 번만 맞춘다
  useEffect(() => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map || status !== 'ready' || hasFitRef.current || pins.length === 0) return

    hasFitRef.current = true
    if (pins.length === 1) {
      map.morph(new maps.LatLng(pins[0].lat, pins[0].lng), SINGLE_PIN_ZOOM)
      return
    }

    const bounds = new maps.LatLngBounds()
    pins.forEach(pin => bounds.extend(new maps.LatLng(pin.lat, pin.lng)))
    map.fitBounds(bounds)
    if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM)
  }, [pins, status])

  // 5) 목록 패널 등에서 고른 핀이 화면 밖이면 그쪽으로 이동
  useEffect(() => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map || !selectedPin) return

    const position = new maps.LatLng(selectedPin.lat, selectedPin.lng)
    if (!map.getBounds().hasLatLng(position)) map.panTo(position)
  }, [selectedPin])
    const moveToMyLocation = useCallback((zoom = MY_LOCATION_ZOOM) => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map) return

    if (!navigator.geolocation) {
      setLocateError('이 브라우저에서는 위치 기능을 사용할 수 없습니다.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        setLocateError('')
        const here = new maps.LatLng(coords.latitude, coords.longitude)
        myLocationRef.current = here
        map.morph(here, zoom)

        // 현재 위치 표시 (파란 점)
        if (myLocationMarkerRef.current) {
          myLocationMarkerRef.current.setPosition(here)
          return
        }
        const dot = document.createElement('div')
        dot.className = styles.myLocationDot
        myLocationMarkerRef.current = new maps.Marker({
          position: here,
          map,
          icon: { content: dot, anchor: new maps.Point(9, 9) },
          zIndex: 200,
        })
      },
      error => {
        setLocating(false)
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? '위치 권한이 거부되었습니다. 주소창의 자물쇠 아이콘에서 허용으로 바꿔주세요.'
            : '현재 위치를 확인하지 못했습니다.'
        )
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    )
  }, [])

  // 핀 목록을 ref에도 반영 (위치가 늦게 도착했을 때 핀을 덮지 않기 위한 판단용)
  useEffect(() => {
    pinsRef.current = pins
  }, [pins])

  const changeZoom = delta => {
    const map = mapRef.current
    if (map) map.setZoom(map.getZoom() + delta)
  }

  const resetView = () => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map) return

    if (pins.length === 0) {
      map.morph(new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng), DEFAULT_ZOOM)
      return
    }

    const bounds = new maps.LatLngBounds()
    pins.forEach(pin => bounds.extend(new maps.LatLng(pin.lat, pin.lng)))
    map.fitBounds(bounds)
    if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM)
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
              {status === 'nokey' ? '네이버 지도 키가 없습니다' : '지도를 표시하지 못했습니다'}
            </strong>
            <p className={styles.noticeText}>{errorMessage}</p>
            <p className={styles.noticeMeta}>현재 접속 주소: {window.location.origin}</p>
            {status === 'nokey' && (
              <ol className={styles.noticeList}>
                <li>NCP 콘솔에서 Maps(Web Dynamic Map) 활성화 후 Client ID 발급</li>
                <li>
                  <code>frontend/.env</code>에 <code>VITE_NAVER_MAP_KEY=발급받은키</code> 추가
                </li>
                <li>
                  콘솔에 <code>http://localhost:5173</code> 도메인 등록
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
            {/* 네이버 지도처럼 지도 위에 떠 있는 원형 내 위치 버튼 */}
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

          <div className={styles.guideHint}>
            <span>드래그로 이동 · 스크롤로 확대/축소</span>
          </div>

          {pins.length === 0 && (
            <div className={styles.emptyHint}>아직 등록된 장소가 없습니다 · 우측 상단에서 장소를 추가해 보세요</div>
          )}

          {locateError && <div className={styles.locateError}>{locateError}</div>}
        </>
      )}
    </div>
  )
}
