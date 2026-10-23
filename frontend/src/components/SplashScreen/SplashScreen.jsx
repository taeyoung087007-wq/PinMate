import { useEffect, useRef, useState } from 'react'
import styles from './SplashScreen.module.css'

// 앱에 들어올 때 한 번만 보여준다 (새로고침해도 같은 탭에서는 다시 안 뜸)
const SESSION_KEY = 'pinmate_splash_shown'

const HOLD_MS = 650        // 로고를 온전히 보여주는 시간
const TEXT_FADE_MS = 380   // "PinMate" 글자가 사라지는 시간
const MOVE_MS = 620        // 심볼이 위쪽으로 올라가며 작아지는 시간
const FADE_OUT_MS = 320    // 오버레이가 걷히는 시간
const TARGET_SIZE = 44     // 이동 후 심볼 크기(px)
const TARGET_TOP = 24      // 이동 후 화면 위쪽 여백(px)

/** 이번 탭에서 스플래시를 아직 안 봤으면 true */
export function shouldShowSplash() {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== 'true'
  } catch {
    return true
  }
}

/**
 * 앱 진입 인트로.
 * 1) 심볼 + "PinMate" 워드마크를 화면 가운데에 보여준다
 * 2) 워드마크가 아래로 흐려지며 사라진다
 * 3) 심볼이 화면 위쪽으로 올라가며 작아진다 (앱이 그 아래로 드러남)
 * 4) 오버레이가 걷히고 앱을 쓸 수 있게 된다
 *
 * 움직임을 줄이기(prefers-reduced-motion) 설정이면 1) → 4)로 바로 넘어간다.
 */
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('hold') // hold | textOut | move | done
  const [moveStyle, setMoveStyle] = useState(null)
  const symbolRef = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true')
    } catch {
      // 시크릿 모드 등 저장이 막힌 경우엔 매번 보여준다
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timers = []

    if (reduceMotion) {
      timers.push(setTimeout(() => setPhase('done'), 300))
      timers.push(setTimeout(() => onDone?.(), 300 + FADE_OUT_MS))
      return () => timers.forEach(clearTimeout)
    }

    // 2) 워드마크 사라짐
    timers.push(setTimeout(() => setPhase('textOut'), HOLD_MS))

    // 3) 심볼 이동 — 지금 위치를 재서 위쪽 목표 지점까지의 변위를 계산한다
    timers.push(setTimeout(() => {
      const rect = symbolRef.current?.getBoundingClientRect()
      if (rect) {
        const deltaY = (TARGET_TOP + TARGET_SIZE / 2) - (rect.top + rect.height / 2)
        setMoveStyle({ transform: `translateY(${deltaY}px) scale(${TARGET_SIZE / rect.height})` })
      }
      setPhase('move')
    }, HOLD_MS + TEXT_FADE_MS))

    // 4) 오버레이 걷기 → 앱 표시
    const endAt = HOLD_MS + TEXT_FADE_MS + MOVE_MS
    timers.push(setTimeout(() => setPhase('done'), endAt))
    timers.push(setTimeout(() => onDone?.(), endAt + FADE_OUT_MS))

    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div
      className={`${styles.overlay} ${phase === 'done' ? styles.overlayDone : ''}`}
      aria-hidden="true"
    >
      <img
        ref={symbolRef}
        src="/logo-symbol.png"
        alt=""
        className={styles.symbol}
        style={moveStyle || undefined}
      />
      <img
        src="/logo-wordmark.png"
        alt=""
        className={`${styles.wordmark} ${phase === 'hold' ? '' : styles.wordmarkOut}`}
      />
    </div>
  )
}
