/**
 * 장소 목록의 검색·정렬 로직 (화면과 분리해 테스트할 수 있게 순수 함수로 둔다).
 * - '모두 인정' 그룹을 항상 위에 두고, 그 안에서만 정렬한다
 * - 추천 0명인 장소는 이름·최신순에서도 묶여 보이지 않도록 그룹은 그대로 유지
 */

export const SORTS = [
  { key: 'recommend', label: '추천순' },
  { key: 'recent', label: '최신순' },
  { key: 'name', label: '이름순' },
]

const recommendCount = pin => pin.recommenders?.length ?? 0
const createdTime = pin => {
  const time = pin.createdAt ? new Date(pin.createdAt).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

/** 검색어가 이름이나 주소에 포함되는지 (대소문자·앞뒤 공백 무시) */
function matches(pin, query) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    (pin.name ?? '').toLowerCase().includes(needle) ||
    (pin.address ?? '').toLowerCase().includes(needle)
  )
}

function comparator(sort) {
  if (sort === 'recent') return (a, b) => createdTime(b) - createdTime(a)
  if (sort === 'name') return (a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko')
  // 기본: 추천 많은 순, 같으면 최신순
  return (a, b) => recommendCount(b) - recommendCount(a) || createdTime(b) - createdTime(a)
}

/**
 * @param {Array} pins 화면에 보이는 핀 목록
 * @param {{ query?: string, sort?: 'recommend'|'recent'|'name' }} options
 * @returns {{ approved: Array, rest: Array, total: number }}
 */
export function filterAndSortPins(pins, { query = '', sort = 'recommend' } = {}) {
  const compare = comparator(sort)
  const visible = pins.filter(pin => matches(pin, query))

  const approved = visible.filter(pin => pin.isAllApproved).sort(compare)
  const rest = visible.filter(pin => !pin.isAllApproved).sort(compare)

  return { approved, rest, total: visible.length }
}
