import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Minus, RotateCcw, Compass } from 'lucide-react'
import { CATEGORY_META } from '../data/mockData'
import styles from './MapCanvas.module.css'

// 기본 서울 중심 좌표 및 줌 스케일
const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }
const ZOOM_BASE_SCALE = 280 // 기본 줌 배율 (화면상 1도당 픽셀)

/**
 * 위도/경도를 캔버스 2D 픽셀 좌표(x, y)로 투영
 */
function latLngToXY(lat, lng, centerLat, centerLng, scale, width, height) {
  const x = (lng - centerLng) * scale + width / 2
  const y = -(lat - centerLat) * scale + height / 2
  return { x, y }
}

/**
 * 캔버스 기반 인터랙티브 지도 컴포넌트
 * - 네이버 지도 API 연동 전 가상 지도 엔진 역할
 * - 지도 패닝(드래그), 줌(휠/버튼), 핀 시각화(카테고리/모두인정 골드 마커)
 */
export default function MapCanvas({ pins, members, onSelectPin, selectedPin }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [center, setCenter] = useState(SEOUL_CENTER)
  const [scale, setScale] = useState(ZOOM_BASE_SCALE)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const [hoveredPin, setHoveredPin] = useState(null)

  // 반응형 리사이즈 감지
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setSize({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 지도 프레임 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = size
    canvas.width = width
    canvas.height = height

    // 지도 어두운 테마 배경
    ctx.fillStyle = '#141524'
    ctx.fillRect(0, 0, width, height)

    // 도로망 / 한강 등 지형 그래픽 그리기
    drawMapBackground(ctx, center, scale, width, height)

    // 핀 렌더링 (일반 핀 먼저 -> 선택/호버된 핀 나중에 그려서 위로 올림)
    const sortedPins = [...pins].sort((a, b) => {
      const aFocus = (selectedPin?.id === a.id || hoveredPin?.id === a.id) ? 1 : 0
      const bFocus = (selectedPin?.id === b.id || hoveredPin?.id === b.id) ? 1 : 0
      return aFocus - bFocus
    })

    sortedPins.forEach(pin => {
      const { x, y } = latLngToXY(pin.lat, pin.lng, center.lat, center.lng, scale, width, height)
      if (x < -50 || x > width + 50 || y < -50 || y > height + 50) return

      const isSelected = selectedPin?.id === pin.id
      const isHovered = hoveredPin?.id === pin.id
      const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
      const memberColor = members.find(m => m.id === pin.addedBy)?.avatarColor ?? meta.color

      drawPin(ctx, x, y, pin, meta, memberColor, isSelected || isHovered, pin.isAllApproved)
    })
  }, [pins, center, scale, size, selectedPin, hoveredPin, members])

  // 지도 배경 그리드 및 랜드마크 라인
  function drawMapBackground(ctx, center, scale, width, height) {
    // 서브 도로 격자선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
    ctx.lineWidth = 1

    const gridGap = 40
    for (let x = (center.lng * scale) % gridGap; x < width; x += gridGap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = (center.lat * scale) % gridGap; y < height; y += gridGap) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // 주요 간선도로
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) {
      const y = (i / 4) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()

      const x = (i / 4) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // 서울의 상징 한강 라인 (부드러운 곡선)
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.16)'
    ctx.lineWidth = Math.max(14, scale * 0.06)
    ctx.lineCap = 'round'
    const riverY = latLngToXY(37.528, 126.978, center.lat, center.lng, scale, width, height).y
    ctx.beginPath()
    ctx.moveTo(0, riverY + 15)
    ctx.bezierCurveTo(width * 0.28, riverY - 30, width * 0.65, riverY + 35, width, riverY - 15)
    ctx.stroke()
    ctx.lineWidth = 1

    // 한강 텍스트 라벨
    ctx.fillStyle = 'rgba(76, 201, 240, 0.28)'
    ctx.font = '600 12px Pretendard, sans-serif'
    ctx.fillText('HAN RIVER · 한강', width * 0.45, riverY + 5)
  }

  // 핀 그리기 함수
  function drawPin(ctx, x, y, pin, meta, memberColor, highlight, isAllApproved) {
    const R = highlight ? 22 : 18

    // 골드 마커 / 하이라이트 발광 효과 (Glow)
    if (highlight || isAllApproved) {
      const glow = ctx.createRadialGradient(x, y - R, 0, x, y - R, R * 2.2)
      const glowColor = isAllApproved ? 'rgba(255, 186, 8,' : 'rgba(108, 99, 255,'
      glow.addColorStop(0, glowColor + '0.45)')
      glow.addColorStop(1, glowColor + '0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y - R, R * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 핀 본체 원형 (모두 인정 시 황금빛 골드, 아니면 카테고리 컬러)
    ctx.fillStyle = isAllApproved ? '#FFBA08' : meta.color
    ctx.beginPath()
    ctx.arc(x, y - R, R, 0, Math.PI * 2)
    ctx.fill()

    // 핀 꼬리 (아래쪽 뾰족한 부분)
    ctx.beginPath()
    ctx.moveTo(x - R * 0.35, y - R * 0.2)
    ctx.quadraticCurveTo(x, y + R * 0.6, x, y + R * 1.1)
    ctx.quadraticCurveTo(x, y + R * 0.6, x + R * 0.35, y - R * 0.2)
    ctx.closePath()
    ctx.fill()

    // 테두리 외곽선
    ctx.strokeStyle = isAllApproved ? '#FFF0B3' : (highlight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)')
    ctx.lineWidth = highlight ? 2.5 : 1.5
    ctx.beginPath()
    ctx.arc(x, y - R, R, 0, Math.PI * 2)
    ctx.stroke()

    // 카테고리 아이콘 / 이모지
    ctx.font = `${R * 0.9}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(meta.icon, x, y - R)

    // 추천 수 뱃지 (2명 이상 추천했을 때)
    if (pin.recommenders.length > 1) {
      const bx = x + R * 0.75, by = y - R * 1.75
      ctx.fillStyle = isAllApproved ? '#FFBA08' : memberColor
      ctx.beginPath()
      ctx.arc(bx, by, 9.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pin.recommenders.length, bx, by)
    }

    // 마우스 호버 또는 선택 시 말풍선 라벨
    if (highlight) {
      const label = pin.name.length > 15 ? pin.name.slice(0, 14) + '…' : pin.name
      ctx.font = '600 12px Pretendard, sans-serif'
      const lw = ctx.measureText(label).width + 20
      const lx = x - lw / 2
      const ly = y - R * 2 - 32

      // 말풍선 배경
      ctx.fillStyle = 'rgba(16, 17, 30, 0.92)'
      ctx.beginPath()
      roundRect(ctx, lx, ly, lw, 24, 6)
      ctx.fill()

      ctx.strokeStyle = isAllApproved ? '#FFBA08' : 'rgba(108, 99, 255, 0.6)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x, ly + 12)
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // 좌표로 핀 찾기 (히트 테스트)
  function getPinAtXY(clientX, clientY) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { width, height } = size

    for (let i = pins.length - 1; i >= 0; i--) {
      const pin = pins[i]
      const { x, y } = latLngToXY(pin.lat, pin.lng, center.lat, center.lng, scale, width, height)
      const R = 22
      const dx = mx - x, dy = my - (y - 18)
      if (dx * dx + dy * dy <= R * R * 1.5) return pin
    }
    return null
  }

  // 마우스 이동 이벤트
  const onMouseMove = useCallback((e) => {
    if (dragging && dragStart.current) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setCenter(prev => ({
        lat: prev.lat + dy / scale,
        lng: prev.lng - dx / scale,
      }))
      dragStart.current = { x: e.clientX, y: e.clientY }
    } else {
      const pin = getPinAtXY(e.clientX, e.clientY)
      setHoveredPin(pin || null)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = pin ? 'pointer' : 'grab'
      }
    }
  }, [dragging, scale, pins, center, size])

  const onMouseDown = (e) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
  }

  const onMouseUp = (e) => {
    if (!dragging) return
    setDragging(false)
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    const dx = Math.abs(e.clientX - (dragStart.current?.x ?? e.clientX))
    const dy = Math.abs(e.clientY - (dragStart.current?.y ?? e.clientY))
    if (dx < 5 && dy < 5) {
      const pin = getPinAtXY(e.clientX, e.clientY)
      onSelectPin(pin || null)
    }
    dragStart.current = null
  }

  // 휠 스크롤 줌
  const onWheel = (e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 0.88
    setScale(prev => Math.max(80, Math.min(2200, prev * factor)))
  }

  // 줌 컨트롤 버튼 핸들러
  const zoomIn = () => setScale(prev => Math.min(2200, prev * 1.3))
  const zoomOut = () => setScale(prev => Math.max(80, prev * 0.77))
  const resetView = () => {
    setCenter(SEOUL_CENTER)
    setScale(ZOOM_BASE_SCALE)
  }

  return (
    <div ref={containerRef} className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { setDragging(false); setHoveredPin(null) }}
        onWheel={onWheel}
      />

      {/* 줌 및 리셋 플로팅 컨트롤 */}
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={zoomIn} title="확대">
          <Plus size={16} />
        </button>
        <button className={styles.controlBtn} onClick={zoomOut} title="축소">
          <Minus size={16} />
        </button>
        <div className={styles.controlDivider} />
        <button className={styles.controlBtn} onClick={resetView} title="서울 전체 보기">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* 지도 안내 힌트 */}
      <div className={styles.guideHint}>
        <span>드래그로 지도 이동 · 스크롤로 줌</span>
      </div>
    </div>
  )
}
