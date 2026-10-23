import { useEffect, useRef, useState } from 'react'
import styles from './SplashScreen.module.css'

// 앱에 들어올 때 한 번만 보여준다 (새로고침해도 같은 탭에서는 다시 안 뜬다)
const SESSION_KEY = 'pinmate_splash_shown'

const HOLD_MS = 600         // 로고를 온전히 보여주는 시간
const TEXT_FADE_MS = 360    // "PinMate" 글자가 사라지는 시간
const SCATTER_MS = 900      // 심볼이 부서져 흩어지는 시간
const FADE_OUT_MS = 300     // 오버레이가 걷히는 시간

const SYMBOL_SIZE = 168     // 화면에 보이는 심볼 크기(px)
const SAMPLE_STEP = 3       // 픽셀을 몇 칸마다 파티클로 만들지 (작을수록 촘촘)

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
 * 3) 심볼이 잘게 부서져 사방으로 흩어지며 사라진다 (그 아래로 지도가 드러남)
 * 4) 오버레이가 걷히고 앱을 쓸 수 있게 된다
 *
 * 흩어지는 효과는 심볼 이미지의 픽셀을 읽어 파티클로 만든다.
 * 움직임을 줄이기(prefers-reduced-motion) 설정이면 흩어지지 않고 바로 걷힌다.
 */
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('hold') // hold | textOut | scatter | done
  const symbolRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true')
    } catch {
      // 시크릿 모드 등 저장이 막힌 경우엔 매번 보여준다
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timers = []

    if (reduceMotion) {
      timers.push(setTimeout(() => setPhase('done'), 400))
      timers.push(setTimeout(() => onDone?.(), 400 + FADE_OUT_MS))
      return () => timers.forEach(clearTimeout)
    }

    // 2) 워드마크 사라짐
    timers.push(setTimeout(() => setPhase('textOut'), HOLD_MS))

    // 3) 심볼이 부서져 흩어진다
    const scatterAt = HOLD_MS + TEXT_FADE_MS
    timers.push(setTimeout(() => {
      setPhase('scatter')
      startScatter()
    }, scatterAt))

    // 4) 오버레이 걷기 → 앱 표시
    const endAt = scatterAt + SCATTER_MS
    timers.push(setTimeout(() => setPhase('done'), endAt))
    timers.push(setTimeout(() => onDone?.(), endAt + FADE_OUT_MS))

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(rafRef.current)
    }
    // startScatter 는 매 렌더마다 새로 만들어지지만, 타이머에서 한 번만 호출되므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone])

  /** 심볼 픽셀을 파티클로 바꿔 사방으로 날려보낸다 */
  const startScatter = () => {
    const img = symbolRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    // 화면 좌표계로 옮기기 위해 심볼의 현재 위치를 잰다
    const rect = img.getBoundingClientRect()

    // 심볼을 표시 크기로 그려 픽셀을 읽는다
    const off = document.createElement('canvas')
    off.width = SYMBOL_SIZE
    off.height = SYMBOL_SIZE
    const octx = off.getContext('2d')
    octx.drawImage(img, 0, 0, SYMBOL_SIZE, SYMBOL_SIZE)
    const pixels = octx.getImageData(0, 0, SYMBOL_SIZE, SYMBOL_SIZE).data

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const particles = []

    for (let y = 0; y < SYMBOL_SIZE; y += SAMPLE_STEP) {
      for (let x = 0; x < SYMBOL_SIZE; x += SAMPLE_STEP) {
        const i = (y * SYMBOL_SIZE + x) * 4
        if (pixels[i + 3] < 128) continue // 투명한 곳은 건너뛴다

        const px = rect.left + (x / SYMBOL_SIZE) * rect.width
        const py = rect.top + (y / SYMBOL_SIZE) * rect.height
        const dx = px - cx
        const dy = py - cy
        const dist = Math.hypot(dx, dy) || 1
        // 중심에서 멀수록 조금 더 빠르게 퍼진다
        const speed = 140 + Math.random() * 220 + (dist / SYMBOL_SIZE) * 260

        particles.push({
          x: px,
          y: py,
          vx: (dx / dist) * speed + (Math.random() - 0.5) * 60,
          vy: (dy / dist) * speed - 40 - Math.random() * 60,
          size: 1.2 + Math.random() * 1.6,
          color: `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`,
          life: 1,
        })
      }
    }

    let last = performance.now()

    const tick = now => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      ctx.clearRect(0, 0, w, h)

      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true

        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 340 * dt        // 살짝 아래로 떨어지는 느낌
        p.vx *= 0.99            // 공기 저항
        p.life -= dt / (SCATTER_MS / 1000)

        if (p.life <= 0) continue
        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, w, h)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <div
      className={`${styles.overlay} ${phase === 'done' ? styles.overlayDone : ''}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.stage}>
        <img
          ref={symbolRef}
          src="/logo-symbol.png"
          alt=""
          className={styles.symbol}
          style={{ opacity: phase === 'scatter' || phase === 'done' ? 0 : 1 }}
        />
      </div>
      <img
        src="/logo-wordmark.png"
        alt=""
        className={`${styles.wordmark} ${phase === 'hold' ? '' : styles.wordmarkOut}`}
      />
    </div>
  )
}
