import { useEffect, useState } from 'react'
import { searchPlaces } from '../places'
import { geocode } from '../geocode'
import styles from './OriginInput.module.css'

// 입력이 멈추고 이만큼 지나면 검색한다 (글자마다 검색하지 않게)
const SEARCH_DELAY_MS = 300

/**
 * 길찾기 출발지 입력
 * - GPS 를 허용했으면 "내 위치" 가 들어 있고, 허용 안 했으면 비어 있다
 * - 눌러서 장소명·주소로 검색해 바꿀 수 있고, 📍 로 다시 내 위치로 돌아간다
 * @param {{ name, lat, lng, mine?: boolean } | null} value
 */
export default function OriginInput({ value, onChange, onUseMyLocation, locating, note }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const keyword = query.trim()
    if (!editing || !keyword) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      const [places, addresses] = await Promise.all([
        searchPlaces(keyword).catch(() => []),
        geocode(keyword).catch(() => []),
      ])
      if (cancelled) return
      setResults([...places.slice(0, 6), ...addresses.slice(0, 3)])
      setSearching(false)
    }, SEARCH_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, editing])

  const startEditing = () => {
    setEditing(true)
    setQuery('')
  }

  const pick = place => {
    onChange({ name: place.name, lat: place.lat, lng: place.lng, mine: false })
    setEditing(false)
    setQuery('')
  }

  return (
    <div className={styles.wrap}>
      {editing ? (
        <input
          className={styles.input}
          // 누르자마자 바로 입력할 수 있게
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setEditing(false)}
          // 결과를 누를 시간을 주고 닫는다
          onBlur={() => setTimeout(() => setEditing(false), 150)}
          placeholder="출발지 장소명·주소 검색"
          aria-label="출발지 검색"
        />
      ) : (
        <button type="button" className={`${styles.input} ${styles.display}`} onClick={startEditing}>
          {value ? value.name : <span className={styles.placeholder}>{note || '출발지를 입력하세요'}</span>}
        </button>
      )}

      <button
        type="button"
        className={`${styles.myLocation} ${value?.mine ? styles.myLocationOn : ''}`}
        onClick={onUseMyLocation}
        disabled={locating}
        aria-label="내 위치를 출발지로"
        title="내 위치를 출발지로"
      >
        {locating ? '…' : '📍'}
      </button>

      {editing && query.trim() && (
        <ul className={styles.results} role="listbox" aria-label="출발지 검색 결과">
          {searching && results.length === 0 && <li className={styles.empty}>검색 중…</li>}
          {!searching && results.length === 0 && <li className={styles.empty}>결과가 없어요</li>}
          {results.map((place, i) => (
            <li key={`${place.name}-${i}`}>
              <button
                type="button"
                className={styles.result}
                // blur 보다 먼저 고르도록 mousedown 에서 처리
                onMouseDown={e => { e.preventDefault(); pick(place) }}
              >
                <strong>{place.name}</strong>
                {place.address && place.address !== place.name && <span>{place.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
