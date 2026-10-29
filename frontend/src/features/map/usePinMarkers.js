import { useCallback, useEffect, useRef } from 'react'
import { CATEGORY_META } from './categories'
import { isMajority } from './consensus'
import { anchorContent } from './overlayAnchor'
import styles from './components/PinMarker.module.css'

// 마커 아이콘 기준점: 원형 마커의 중심이 좌표에 오도록
const PIN_ANCHOR = { x: 17, y: 17 }

// 과반 인정(은색) 마커 색
const SILVER = '#9AA8BC'

// 클러스터링: 화면을 격자로 나눠 같은 칸에 모인 핀을 하나로 묶는다
const CLUSTER_CELL_PX = 72      // 격자 한 칸 크기(화면 픽셀). 작을수록 덜 묶인다
const CLUSTER_MIN_COUNT = 2     // 같은 칸에 이만큼 있으면 묶는다
const CLUSTER_SIZE = 46         // 클러스터 원 지름
// 이 레벨보다 확대하면(숫자가 작을수록 확대) 묶지 않는다.
// 개수 기준을 두면 "24개는 그대로, 25개는 갑자기 다 묶임" 같은 절벽이 생긴다.
// 밀도는 격자가 알아서 판단하므로, 확대했을 때 풀리는지만 레벨로 막는다.
const CLUSTER_MIN_LEVEL = 4

/** 핀 하나를 나타내는 DOM 요소 (이름 라벨 + 추천 수 뱃지) */
function createPinElement({ pin, meta, memberColor, majority, isSelected }) {
  const isGold = Boolean(pin.isAllApproved)
  const isSilver = !isGold && majority // 과반 인정

  const wrap = document.createElement('div')
  wrap.className = [
    styles.pinWrap,
    isGold && styles.pinWrapGold,
    isSilver && styles.pinWrapSilver,
    isSelected && styles.pinWrapSelected,
  ]
    .filter(Boolean)
    .join(' ')
  wrap.title = pin.name

  const body = document.createElement('div')
  body.className = styles.pinBody
  body.style.background = isGold ? '#FFBA08' : isSilver ? SILVER : meta.color
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
    badge.style.background = isGold ? '#FFBA08' : isSilver ? SILVER : memberColor
    badge.textContent = String(recommendCount)
    wrap.appendChild(badge)
  }

  return wrap
}

/** 여러 핀을 하나로 묶은 클러스터 마커 (개수 표시) */
function createClusterElement({ count, color }) {
  const wrap = document.createElement('div')
  wrap.className = styles.clusterWrap

  const body = document.createElement('div')
  body.className = styles.clusterBody
  body.style.background = color
  body.textContent = String(count)

  wrap.appendChild(body)
  return wrap
}

/** 묶인 핀들 중 가장 많은 카테고리 색 — 줌아웃 상태에서도 동네 성격이 보인다 */
function dominantColor(group) {
  const tally = new Map()
  group.forEach(pin => {
    const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
    tally.set(meta.color, (tally.get(meta.color) ?? 0) + 1)
  })
  let best = null
  let bestCount = -1
  tally.forEach((count, color) => {
    if (count > bestCount) {
      best = color
      bestCount = count
    }
  })
  return best
}

/**
 * 지도 위에 핀을 그리는 훅.
 * - 핀이 많으면 화면 72px 격자로 묶어 클러스터(개수)로 표시한다
 * - 선택된 핀은 클러스터에서 빼서 항상 단독으로 보여준다
 * - 팬·줌이 끝날 때(idle) 다시 그려서, 확대하면 자연스럽게 풀린다
 *
 * @param {object} params
 * @param {React.RefObject} params.mapRef 지도 인스턴스 (kakao.maps.Map)
 * @param {string} params.status 'ready' 가 되면 그리기 시작
 * @param {Array} params.pins 화면에 그릴 핀 목록
 * @param {Array} params.members 멤버 목록 (색상 조회용)
 * @param {object|null} params.selectedPin 선택된 핀
 * @param {(pin: object) => void} params.onSelectPin 핀 클릭 콜백
 */
export function usePinMarkers({ mapRef, status, pins, members, selectedPin, onSelectPin }) {
  const markersRef = useRef(new Map()) // pinId -> { marker, pin, meta, memberColor }
  const clusterRef = useRef([]) // 현재 떠 있는 클러스터 오버레이
  const onSelectRef = useRef(onSelectPin)

  useEffect(() => {
    onSelectRef.current = onSelectPin
  }, [onSelectPin])

  const render = useCallback((maps, map) => {
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current.clear()
    clusterRef.current.forEach(overlay => overlay.setMap(null))
    clusterRef.current = []

    const infoOf = pin => {
      const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
      const memberColor = members.find(m => m.id === pin.addedBy)?.avatarColor ?? meta.color
      return { meta, memberColor, majority: isMajority(pin, members) }
    }

    const placePin = (pin, isSelected) => {
      const { meta, memberColor, majority } = infoOf(pin)
      const marker = new maps.CustomOverlay({
        position: new maps.LatLng(pin.lat, pin.lng),
        content: anchorContent(
          createPinElement({ pin, meta, memberColor, majority, isSelected }),
          PIN_ANCHOR.x,
          PIN_ANCHOR.y
        ),
        map,
        zIndex: isSelected ? 100 : pin.isAllApproved ? 50 : 10,
        // 기본값(false)이면 클릭이 지도로 통과해 핀을 눌러도 "위치 고르기"가 같이 뜬다
        clickable: true,
      })
      // 오버레이는 DOM이라 클릭 리스너를 요소에 직접 건다
      marker.getContent().firstChild.addEventListener('click', () => onSelectRef.current(pin))
      markersRef.current.set(pin.id, { marker, pin, meta, memberColor, majority })
    }

    // 충분히 확대했으면 하나씩 그대로 보여준다 (사용자가 일부러 확대한 상황)
    if (map.getLevel() < CLUSTER_MIN_LEVEL) {
      pins.forEach(pin => placePin(pin, pin.id === selectedPin?.id))
      return
    }

    const projection = map.getProjection()
    const buckets = new Map()

    pins.forEach(pin => {
      // 선택된 핀은 항상 단독 — 상세 패널이 열린 핀이 클러스터에 숨으면 안 된다
      if (pin.id === selectedPin?.id) {
        placePin(pin, true)
        return
      }
      const point = projection.containerPointFromCoords(new maps.LatLng(pin.lat, pin.lng))
      const key = `${Math.floor(point.x / CLUSTER_CELL_PX)}:${Math.floor(point.y / CLUSTER_CELL_PX)}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(pin)
    })

    buckets.forEach(group => {
      if (group.length < CLUSTER_MIN_COUNT) {
        placePin(group[0], false)
        return
      }

      const lat = group.reduce((sum, pin) => sum + pin.lat, 0) / group.length
      const lng = group.reduce((sum, pin) => sum + pin.lng, 0) / group.length
      const position = new maps.LatLng(lat, lng)

      const overlay = new maps.CustomOverlay({
        position,
        content: anchorContent(
          createClusterElement({ count: group.length, color: dominantColor(group) }),
          CLUSTER_SIZE / 2,
          CLUSTER_SIZE / 2
        ),
        map,
        zIndex: 20,
        clickable: true,
      })

      // 누르면 그 자리로 확대한다 (줌인하면 자연스럽게 풀린다)
      overlay.getContent().firstChild.addEventListener('click', () => {
        map.setLevel(Math.max(1, map.getLevel() - 2))
        map.panTo(position)
      })

      clusterRef.current.push(overlay)
    })
  }, [pins, members, selectedPin])

  // 지도가 준비되면 그리고, 팬·줌이 끝날 때마다 다시 그린다
  useEffect(() => {
    if (status !== 'ready') return
    const maps = window.kakao?.maps
    const map = mapRef.current
    if (!maps || !map) return

    render(maps, map)

    const onIdle = () => render(maps, map)
    maps.event.addListener(map, 'idle', onIdle)
    return () => maps.event.removeListener(map, 'idle', onIdle)
  }, [status, render, mapRef])
}
