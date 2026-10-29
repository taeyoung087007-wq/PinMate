/**
 * 핀을 화면 격자로 묶는 순수 함수.
 *
 * 카카오 `MarkerClusterer` 는 이미지 마커만 묶을 수 있어서, 이름 라벨이 붙은
 * CustomOverlay 핀을 쓰는 우리 구조에는 맞지 않는다. 그래서 화면 좌표 기준으로 직접 묶는다.
 *
 * 지도 API 를 직접 만지지 않고 `project`(핀 → 화면 좌표)만 받으므로 테스트할 수 있다.
 */

export const CLUSTER_CELL_PX = 72 // 격자 한 칸 크기(화면 픽셀). 작을수록 덜 묶인다
export const CLUSTER_MIN_COUNT = 2 // 같은 칸에 이만큼 있으면 묶는다
// 이 레벨보다 확대하면(숫자가 작을수록 확대) 묶지 않는다.
// 개수 기준을 두면 "24개는 그대로, 25개는 갑자기 다 묶임" 같은 절벽이 생긴다.
// 밀도는 격자가 알아서 판단하므로, 확대했을 때 풀리는지만 레벨로 막는다.
// 실측 근거(390px 뷰포트, 200m 안 핀 10개): 레벨 3에서 풀면 라벨이 15쌍 겹쳐 읽을 수
// 없고, 레벨 2에서야 1쌍만 겹친다. → 라벨이 읽히는 레벨 2부터 풀어준다.
export const CLUSTER_MIN_LEVEL = 3

/**
 * @typedef {{ id: string|number, lat: number, lng: number }} Pin
 * @typedef {{ pins: Pin[], lat: number, lng: number }} Cluster
 * @typedef {{ pin: Pin, isSelected: boolean }} Single
 */

/**
 * @param {Pin[]} pins
 * @param {object} options
 * @param {(pin: Pin) => {x: number, y: number}} options.project 핀 → 현재 화면 좌표
 * @param {number} options.level 지도 줌 레벨 (작을수록 확대)
 * @param {string|number|null} [options.selectedId] 선택된 핀 — 항상 단독으로 보여준다
 * @returns {{ singles: Single[], clusters: Cluster[] }}
 */
export function clusterPins(pins, { project, level, selectedId = null }) {
  // 충분히 확대했으면 하나씩 그대로 보여준다 (사용자가 일부러 확대한 상황)
  if (level < CLUSTER_MIN_LEVEL) {
    return {
      singles: pins.map(pin => ({ pin, isSelected: pin.id === selectedId })),
      clusters: [],
    }
  }

  const singles = []
  const buckets = new Map()

  for (const pin of pins) {
    // 선택된 핀은 항상 단독 — 상세 패널이 열린 핀이 클러스터에 숨으면 안 된다
    if (pin.id === selectedId) {
      singles.push({ pin, isSelected: true })
      continue
    }
    const { x, y } = project(pin)
    const key = `${Math.floor(x / CLUSTER_CELL_PX)}:${Math.floor(y / CLUSTER_CELL_PX)}`
    const group = buckets.get(key)
    if (group) group.push(pin)
    else buckets.set(key, [pin])
  }

  const clusters = []

  buckets.forEach(group => {
    if (group.length < CLUSTER_MIN_COUNT) {
      singles.push({ pin: group[0], isSelected: false })
      return
    }
    clusters.push({
      pins: group,
      lat: group.reduce((sum, pin) => sum + pin.lat, 0) / group.length,
      lng: group.reduce((sum, pin) => sum + pin.lng, 0) / group.length,
    })
  })

  return { singles, clusters }
}
