import { useEffect, useRef } from 'react'

/** 이 거리 이상 끌었거나 이 속도로 튕겼으면 닫는다 */
const DISMISS_DISTANCE_PX = 80
const DISMISS_VELOCITY = 0.7 // px/ms (최근 100ms 창의 평균)

/**
 * 패널을 손가락 드래그(스와이프)로 닫히게 하는 훅.
 *
 * 반환하는 panelRef 는 패널 본체에, handleRef 는 드래그 시작점(그랩 핸들)에 붙인다.
 * 드래그 중에는 패널이 손가락을 따라 움직이고, 놓았을 때 기준을 넘었으면
 * 날려 보낸 뒤 onDismiss 를 호출한다. 못 미치면 제자리로 돌아간다.
 *
 * 리스너는 window 에 붙고 이벤트 시점에 ref 를 조회한다 — 패널이 조건부 렌더로
 * 나중에 떠도(예: 경로 패널) 이미 마운트된 부모의 훅이 그대로 동작한다.
 *
 * @param {() => void} onDismiss 닫힘이 확정됐을 때 호출
 * @param {{
 *   panelRef?: import('react').RefObject<HTMLElement>,
 *   axis?: 'x' | 'y',
 *   sign?: 1 | -1,
 *   baseTransform?: string,
 * }} [options]
 *   panelRef    : 패널에 이미 ref 가 붙어 있으면 그걸 재사용한다
 *   axis        : 닫는 방향의 축 (기본 'y')
 *   sign        : 양수 방향으로 닫히면 1, 음수 방향이면 -1 (기본 1)
 *                 하단 시트(아래로 쓸어 닫기)=1, 상단 시트(위로)=-1, 우측 패널(오른쪽으로, x축)=1
 *   baseTransform: 중앙 정렬(translateX(-50%)) 등 패널이 원래 가진 transform.
 *                  드래그 중에도 유지돼야 화면 밖으로 빗나가지 않는다
 */
export function usePanelDrag(onDismiss, { panelRef: externalPanelRef, axis = 'y', sign = 1, baseTransform = '' } = {}) {
  const ownPanelRef = useRef(null)
  const panelRef = externalPanelRef ?? ownPanelRef
  const handleRef = useRef(null)
  const dragRef = useRef(null)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const coord = e => (axis === 'x' ? e.clientX : e.clientY)

    // baseTransform(중앙 정렬)을 유지한 채 이동 반영
    const apply = (panel, offset) => {
      const move = axis === 'x' ? `translateX(${offset}px)` : `translateY(${offset}px)`
      panel.style.transform = baseTransform ? `${baseTransform} ${move}` : move
    }

    const onDown = e => {
      const handle = handleRef.current
      const panel = panelRef.current
      // 핸들이 아직 화면에 없으면(조건부 렌더) 무시. 리스너는 계속 살아 있다
      if (!handle || !panel) return
      // 이 훅의 핸들에서 시작한 드래그만 처리한다 (다른 패널의 핸들과 구분)
      if (e.target !== handle && !handle.contains(e.target)) return
      // 그랩 핸들에는 버튼이 없지만, 다른 요소를 핸들로 쓰게 될 경우를 대비한다
      if (e.target.closest?.('button, input, textarea, select, a, [contenteditable]')) return
      // 등장 애니메이션이 forwards 로 transform 을 계속 잡고 있으면
      // 인라인 transform 이 무시된다 — 드래그를 시작했으니 애니메이션을 내보낸다
      panel.style.animation = 'none'
      panel.style.transition = 'none'
      dragRef.current = { panel, start: coord(e), offset: 0, peakV: 0, samples: [] }
    }

    const onMove = e => {
      const d = dragRef.current
      if (!d) return
      const delta = coord(e) - d.start
      // 닫는 방향으로만 움직인다. 반대 방향은 화면 밖으로 빠지지 않게 막는다
      const offset = sign > 0 ? Math.max(0, delta) : Math.min(0, delta)
      const now = performance.now()

      // 속도는 최근 100ms 창의 평균으로 잰다. 이벤트 한 쌍의 간격은
      // 타이머/입력 지터 때문에 소음이 커서, 순간 값 하나로 판단하면
      // 느린 드래그도 플릭으로 오판한다.
      d.samples.push({ t: now, offset })
      while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()
      const first = d.samples[0]
      const dtWindow = now - first.t
      if (dtWindow > 8) {
        d.peakV = Math.max(d.peakV, Math.abs(offset - first.offset) / dtWindow)
      }

      d.offset = offset
      apply(d.panel, offset)
    }

    const finish = dismiss => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      const size = axis === 'x' ? d.panel.offsetWidth : d.panel.offsetHeight
      d.panel.style.transition = 'transform 0.22s var(--ease)'
      if (dismiss) {
        // 닫는 방향으로 날려 보내고, 애니메이션이 끝날 무렵 실제로 닫는다
        apply(d.panel, sign * (size + 60))
        window.setTimeout(() => onDismissRef.current?.(), 200)
      } else {
        apply(d.panel, 0) // 제자리 복귀
      }
    }

    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      finish(Math.abs(d.offset) >= DISMISS_DISTANCE_PX || d.peakV >= DISMISS_VELOCITY)
    }

    const onCancel = () => {
      if (!dragRef.current) return
      finish(false) // 시스템이 드래그를 뺏으면 제자리로
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [panelRef, axis, sign, baseTransform])

  return { panelRef, handleRef }
}
