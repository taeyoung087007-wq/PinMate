import { useEffect, useMemo, useState } from 'react'
import { Search, X, MapPin } from 'lucide-react'
import { searchPlaces } from '../places'
import { geocode } from '../geocode'
import { CATEGORY_META } from '../categories'
import styles from './TopSearch.module.css'

// 입력이 멈추고 이만큼 지나면 검색한다 (글자마다 검색하지 않게)
const SEARCH_DELAY_MS = 300
const MAX_PINS = 5

/**
 * 상단 검색바: 우리 모임 장소 + 상호명·주소를 한 번에 찾는다
 * - 같은 이름의 가게(지점)는 주소와 함께 목록으로 보여 준다
 * - 우리 핀을 고르면 핀 상세, 장소·주소를 고르면 지도에서 그 자리를 보여 준다
 */
export default function TopSearch({ pins, onSelectPin, onPickPlace }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [places, setPlaces] = useState([])
  const [searching, setSearching] = useState(false)
  const keyword = query.trim()

  const pinMatches = useMemo(() => {
    if (!keyword) return []
    const q = keyword.toLowerCase()
    return pins
      .filter(pin => pin.name?.toLowerCase().includes(q) || pin.address?.toLowerCase().includes(q))
      .slice(0, MAX_PINS)
  }, [pins, keyword])

  useEffect(() => {
    if (!keyword) {
      setPlaces([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      const [found, addresses] = await Promise.all([
        searchPlaces(keyword).catch(() => []),
        geocode(keyword).catch(() => []),
      ])
      if (cancelled) return
      setPlaces([
        ...found.map(p => ({ ...p, kind: 'place' })),
        ...addresses.slice(0, 3).map(p => ({ ...p, kind: 'address' })),
      ])
      setSearching(false)
    }, SEARCH_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [keyword])

  const close = () => setOpen(false)

  const choosePin = pin => {
    onSelectPin(pin)
    close()
  }

  const choosePlace = place => {
    onPickPlace(place)
    close()
  }

  // 엔터: 첫 결과로 바로 이동
  const handleSubmit = e => {
    e.preventDefault()
    if (pinMatches[0]) choosePin(pinMatches[0])
    else if (places[0]) choosePlace(places[0])
  }

  const showList = open && keyword

  return (
    <form className={styles.box} onSubmit={handleSubmit} role="search">
      <div className={styles.field}>
      <Search size={14} className={styles.icon} aria-hidden="true" />
      <input
        className={styles.input}
        placeholder="장소명, 주소 검색"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        // 결과를 누를 시간을 주고 닫는다
        onBlur={() => setTimeout(close, 150)}
        onKeyDown={e => e.key === 'Escape' && close()}
        aria-label="장소명, 주소 검색"
      />
      {query && (
        <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="검색어 지우기">
          <X size={12} />
        </button>
      )}
      </div>

      {showList && (
        <div className={styles.results} role="listbox" aria-label="검색 결과">
          {pinMatches.length > 0 && (
            <>
              <div className={styles.section}>우리 모임 장소</div>
              {pinMatches.map(pin => (
                <button
                  key={pin.id}
                  type="button"
                  className={styles.item}
                  onMouseDown={e => { e.preventDefault(); choosePin(pin) }}
                >
                  <span className={styles.itemIcon} aria-hidden="true">{(CATEGORY_META[pin.category] ?? CATEGORY_META.etc).icon}</span>
                  <span className={styles.itemText}>
                    <strong>{pin.name}</strong>
                    <span>{pin.address}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          <div className={styles.section}>장소 · 주소</div>
          {searching && places.length === 0 && <div className={styles.empty}>검색 중…</div>}
          {!searching && places.length === 0 && <div className={styles.empty}>결과가 없어요</div>}
          {places.map((place, i) => (
            <button
              key={`${place.kind}-${place.name}-${place.lat}-${i}`}
              type="button"
              className={styles.item}
              onMouseDown={e => { e.preventDefault(); choosePlace(place) }}
            >
              <MapPin size={14} className={styles.itemPin} aria-hidden="true" />
              <span className={styles.itemText}>
                <strong>
                  {place.name}
                  {place.kind === 'address' && <em className={styles.tag}>주소</em>}
                  {place.category && <em className={styles.category}>{place.category.split('>').pop()}</em>}
                </strong>
                {place.address && place.address !== place.name && <span>{place.address}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
