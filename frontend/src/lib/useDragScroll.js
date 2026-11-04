import { useEffect, useRef } from 'react'

/**
 * 가로로 넘치는 칩 줄을 마우스로도 넘길 수 있게 한다 (터치는 브라우저가 원래 스크롤한다)
 * - 끌어서 넘기기. 끈 뒤 손을 떼면 칩이 눌리지 않게 클릭을 막는다
 * - 세로 휠을 가로 스크롤로
 */
export function useDragScroll() {
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
