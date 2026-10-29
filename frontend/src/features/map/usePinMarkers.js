import { useCallback, useEffect, useRef } from 'react'
import { CATEGORY_META } from './categories'
import { isMajority } from './consensus'
import { clusterPins } from './clusterPins'
import { anchorContent } from './overlayAnchor'
import styles from './components/PinMarker.module.css'

// 마커 아이콘 기준점: 원형 마커의 중심이 좌표에 오도록
const PIN_ANCHOR = { x: 17, y: 17 }

// 과반 인정(은색) 마커 색
const SILVER = '#9AA8BC'

const CLUSTER_SIZE = 46 // 클러스터 원 지름

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

    // 어떤 핀을 묶을지는 순수 함수가 판단한다 (clusterPins.js)
    const projection = map.getProjection()
    const { singles, clusters } = clusterPins(pins, {
      project: pin => projection.containerPointFromCoords(new maps.LatLng(pin.lat, pin.lng)),
      level: map.getLevel(),
      selectedId: selectedPin?.id,
    })

    singles.forEach(({ pin, isSelected }) => placePin(pin, isSelected))

    clusters.forEach(group => {
      const position = new maps.LatLng(group.lat, group.lng)

      const overlay = new maps.CustomOverlay({
        position,
        content: anchorContent(
          createClusterElement({ count: group.pins.length, color: dominantColor(group.pins) }),
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
