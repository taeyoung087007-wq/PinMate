import { describe, expect, it } from 'vitest'
import { CLUSTER_CELL_PX, CLUSTER_MIN_LEVEL, clusterPins } from './clusterPins'

const pin = (id, lat, lng) => ({ id, lat, lng })

describe('clusterPins', () => {
  it('충분히 확대하면 하나도 묶지 않는다', () => {
    const pins = [pin(1, 37.5, 127.0), pin(2, 37.5, 127.0)]

    const { singles, clusters } = clusterPins(pins, {
      project: () => ({ x: 10, y: 10 }),
      level: CLUSTER_MIN_LEVEL - 1,
    })

    expect(clusters).toHaveLength(0)
    expect(singles.map(s => s.pin.id)).toEqual([1, 2])
  })

  it('같은 칸에 있는 핀은 하나로 묶고 중심은 평균 좌표다', () => {
    const pins = [pin(1, 37.5, 127.0), pin(2, 37.7, 127.2)]

    const { singles, clusters } = clusterPins(pins, {
      project: p => ({ x: p.id === 1 ? 10 : 30, y: 10 }),
      level: CLUSTER_MIN_LEVEL,
    })

    expect(singles).toHaveLength(0)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].pins.map(p => p.id)).toEqual([1, 2])
    expect(clusters[0].lat).toBeCloseTo(37.6)
    expect(clusters[0].lng).toBeCloseTo(127.1)
  })

  it('다른 칸에 있으면 각각 단독으로 보여준다', () => {
    const pins = [pin(1, 37.5, 127.0), pin(2, 37.5, 127.0)]

    const { singles, clusters } = clusterPins(pins, {
      project: p => ({ x: p.id === 1 ? 10 : CLUSTER_CELL_PX + 10, y: 10 }),
      level: CLUSTER_MIN_LEVEL,
    })

    expect(clusters).toHaveLength(0)
    expect(singles.map(s => s.pin.id)).toEqual([1, 2])
  })

  it('칸 경계에서는 1픽셀 차이로 갈린다', () => {
    const pins = [pin(1, 37.5, 127.0), pin(2, 37.5, 127.0)]

    const { clusters } = clusterPins(pins, {
      project: p => ({ x: p.id === 1 ? CLUSTER_CELL_PX - 1 : CLUSTER_CELL_PX, y: 10 }),
      level: CLUSTER_MIN_LEVEL,
    })

    expect(clusters).toHaveLength(0)
  })

  it('선택된 핀은 클러스터에서 빠져 단독으로 남는다', () => {
    const pins = [pin(1, 37.5, 127.0), pin(2, 37.5, 127.0)]

    const { singles, clusters } = clusterPins(pins, {
      project: () => ({ x: 10, y: 10 }),
      level: CLUSTER_MIN_LEVEL,
      selectedId: 1,
    })

    expect(clusters).toHaveLength(0)
    expect(singles).toEqual([
      { pin: pins[0], isSelected: true },
      { pin: pins[1], isSelected: false },
    ])
  })

  it('핀이 없으면 빈 결과를 준다', () => {
    const { singles, clusters } = clusterPins([], {
      project: () => ({ x: 0, y: 0 }),
      level: CLUSTER_MIN_LEVEL,
    })

    expect(singles).toEqual([])
    expect(clusters).toEqual([])
  })
})
