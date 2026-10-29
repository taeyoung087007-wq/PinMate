/**
 * 카카오 CustomOverlay 는 "요소의 어느 지점이 좌표에 닿는지"를 비율(0~1)로만 받는다.
 * 요소 크기가 내용마다 달라서 비율을 미리 알 수 없으므로,
 * 크기 0인 컨테이너를 두고 그 안에서 (x, y) 픽셀만큼 왼쪽·위로 밀어 기준점을 맞춘다.
 * → 네이버 지도의 `anchor: Point(x, y)` 와 같은 효과
 */
export function anchorContent(el, x, y) {
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
