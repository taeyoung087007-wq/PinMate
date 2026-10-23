export const CATEGORY_META = {
  food:  { label: '맛집',   icon: '🍽️',  color: '#FF6B6B', cls: 'cat-food'  },
  cafe:  { label: '카페',   icon: '☕',   color: '#FFBA08', cls: 'cat-cafe'  },
  drink: { label: '술집',   icon: '🍺',   color: '#A78BFA', cls: 'cat-drink' },
  stay:  { label: '숙소',   icon: '🏨',   color: '#06D6A0', cls: 'cat-stay'  },
  sight: { label: '명소',   icon: '📸',   color: '#4CC9F0', cls: 'cat-sight' },
  play:  { label: '놀거리', icon: '🎭',   color: '#FF9F1C', cls: 'cat-play'  },
  etc:   { label: '기타',   icon: '📍',   color: '#9B9BB8', cls: 'cat-etc'   },
}

/**
 * 장소 검색의 category 문자열("음식점>술집")을 우리 카테고리 키로 바꾼다.
 * 위에서부터 먼저 맞는 것을 쓰므로 순서가 중요하다.
 * - "음식점>카페,디저트" 처럼 상위가 음식점이어도 카페로 잡히도록 cafe를 food보다 앞에 둔다
 * - "술집>요리주점" 은 '음식점'을 포함하지 않지만, "음식점>주점" 형태도 있어 drink를 맨 앞에 둔다
 */
const CATEGORY_KEYWORDS = [
  ['drink', ['술집', '주점', '호프', '이자카야', '와인바', '칵테일', '포차', 'bar', 'pub']],
  ['cafe', ['카페', '디저트', '베이커리', '커피', '브런치']],
  ['stay', ['숙박', '호텔', '모텔', '펜션', '게스트하우스', '리조트']],
  ['sight', ['관광', '명소', '문화', '예술', '공원', '전시', '미술관', '박물관', '사찰', '유적']],
  ['play', ['스포츠', '레저', '취미', '오락', '노래방', 'pc방', '볼링', '영화']],
  ['food', ['음식점', '한식', '양식', '일식', '중식', '분식', '치킨', '고기', '국밥', '레스토랑', '뷔페']],
]

/**
 * @param {string | null | undefined} placeCategory 장소 검색의 category 값
 * @returns {keyof CATEGORY_META | null} 맞는 카테고리가 없으면 null (호출부가 기본값을 유지한다)
 */
export function guessCategory(placeCategory) {
  if (!placeCategory) return null
  const text = String(placeCategory).toLowerCase()
  for (const [key, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some(keyword => text.includes(keyword))) return key
  }
  return null
}
