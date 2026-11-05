import { useEffect, useRef, useState } from 'react'
import { X, Search, MapPin, Tag, FileText, ArrowLeft, Crosshair } from 'lucide-react'
import { CATEGORY_META, guessCategory } from '../categories'
import { loadKakaoMaps } from '../../../lib/kakaoMaps'
import { geocode, reverseGeocode } from '../geocode'
import { searchPlaces } from '../places'
import styles from './AddPinModal.module.css'

// 지도에서 직접 고를 때의 기본 중심 (서울시청)
const PICKER_CENTER = { lat: 37.5665, lng: 126.9780 }
// 카카오는 레벨이 작을수록 확대된다 (네이버 zoom 15 ≈ 카카오 level 4)
const PICKER_LEVEL = 4

/**
 * 장소 추가 모달
 * - 주소 검색(Geocoding) 또는 지도 클릭(Reverse Geocoding)으로 좌표를 얻는다
 * - 좌표는 반드시 실제 주소에서 나온다 (임의 좌표 생성 없음)
 * - initialPlace: 메인 지도에서 이미 고른 위치 { name, address, lat, lng } 가 있으면 상세 입력부터 시작
 */
const VISIBILITY_OPTIONS = [
  { value: 'private', label: '나만' },
  { value: 'friends', label: '친구' },
  { value: 'team', label: '모임' },
  { value: 'all', label: '전체' },
]

const VISIBILITY_HINT = {
  private: '나만 볼 수 있어요.',
  friends: '친구가 내 지도 레이어로 볼 수 있어요.',
  team: '모임 지도에만 보여요.',
  all: '친구와 모임 모두 볼 수 있어요.',
}

export default function AddPinModal({ teamId, personal = false, onClose, onAdd, initialPlace = null, defaultSyncToPersonal = false }) {
  const [step, setStep] = useState(initialPlace ? 'detail' : 'search') // 'search' | 'detail'
  const [mode, setMode] = useState('search') // 'search' | 'map'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(initialPlace) // { name, address, lat, lng }
  // 등록 방식: 키워드 검색으로 고르면 search, 지도에서 직접 찍으면 manual (나중에 같은 장소 판별에 쓴다)
  const [source, setSource] = useState(initialPlace ? 'manual' : 'search')
  const [picked, setPicked] = useState(null) // 지도에서 찍은 { lat, lng, address, loading }
  const [category, setCategory] = useState('food')
  const [name, setName] = useState(initialPlace?.name ?? '')
  const [memo, setMemo] = useState('')
  const [recommend, setRecommend] = useState(false) // 다녀와 봤으면 등록하면서 바로 추천 (SNS 에서 보고 찍어두기만 하면 끔)
  const [syncToPersonal, setSyncToPersonal] = useState(defaultSyncToPersonal) // 모임에 추가하면서 내 지도에도 같이 저장 (모임 설정이 켜져 있으면 기본 체크)
  const [visibility, setVisibility] = useState('all') // 내 지도 핀 공개 범위: private/friends/team/all
  const [adding, setAdding] = useState(false) // 버튼을 연달아 눌러 같은 장소가 두 번 들어가지 않게

  // 검색: 상호명(카카오 Places)과 주소(카카오 Geocoder)를 동시에 조회해 합친다
  const handleSearch = async e => {
    e.preventDefault()
    const keyword = query.trim()
    if (!keyword) return

    setSearching(true)
    setError('')
    const [placeResult, addressResult] = await Promise.allSettled([searchPlaces(keyword), geocode(keyword)])
    const places = placeResult.status === 'fulfilled' ? placeResult.value : []
    const addresses = addressResult.status === 'fulfilled' ? addressResult.value : []

    // 같은 주소가 양쪽에서 나올 수 있으므로 주소 기준으로 중복 제거
    const seen = new Set()
    const merged = [
      ...places.map(item => ({ ...item, kind: 'place' })),
      ...addresses.map(item => ({ ...item, kind: 'address' })),
    ].filter(item => {
      const key = item.address || item.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setResults(merged)
    if (placeResult.status === 'rejected' && addressResult.status === 'rejected') {
      setError('검색에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
    setSearching(false)
  }

  // 결과 선택 — 좌표가 있으면 바로 쓰고, 없으면 주소로 지오코딩한다
  const handleSelectResult = async place => {
    // 장소 분류("음식점>술집")로 카테고리를 미리 골라준다. 못 맞히면 기본값 유지
    const guessed = guessCategory(place.category)
    if (guessed) setCategory(guessed)
    setSource('search')

    if (place.lat && place.lng) {
      setSelected(place)
      setName(place.name)
      setStep('detail')
      return
    }

    setSelecting(true)
    setError('')
    try {
      const found = await geocode(place.address)
      if (found.length === 0) {
        setError('이 장소의 좌표를 찾지 못했습니다. 지도에서 직접 선택해 주세요.')
        return
      }
      setSelected({ ...found[0], name: place.name, kakaoPlaceId: place.kakaoPlaceId })
      setName(place.name)
      setStep('detail')
    } catch (err) {
      setError(err.message)
    } finally {
      setSelecting(false)
    }
  }

  // 지도 클릭 → 역지오코딩으로 주소 채우기
  const handlePick = async ({ lat, lng }) => {
    setPicked({ lat, lng, address: '', loading: true })
    try {
      const address = await reverseGeocode(lat, lng)
      setPicked({ lat, lng, address: address || '주소를 확인하지 못했습니다', loading: false })
    } catch {
      setPicked({ lat, lng, address: '주소를 확인하지 못했습니다', loading: false })
    }
  }

  // 지도에서 고른 위치로 확정
  const handleUsePicked = () => {
    if (!picked) return
    const place = {
      name: picked.address || '',
      address: picked.address || '',
      lat: picked.lat,
      lng: picked.lng,
    }
    setSelected(place)
    setName(place.name)
    setSource('manual')
    setStep('detail')
  }

  const handleAdd = async () => {
    if (!selected || adding) return
    setAdding(true)
    await onAdd({
      teamId,
      name: name.trim() || selected.address,
      address: selected.address,
      category,
      lat: selected.lat,
      lng: selected.lng,
      memo: (personal || recommend) ? memo.trim() : '',
      recommend: personal ? false : recommend,   // 개인 장소에는 추천 개념이 없다
      syncToPersonal: personal ? false : syncToPersonal,   // 모임 장소를 내 지도에도 저장할지
      visibility: personal ? visibility : undefined,       // 내 지도 핀 공개 범위 (기본 전체)
      kakaoPlaceId: selected.kakaoPlaceId ?? null,          // 검색·주변 가게로 고른 경우에만 있다
      source,
    })
    setAdding(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} glass-card animate-slide-up`}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            {step === 'search' ? (
              <>
                <Search size={16} color="var(--primary-light)" /> 장소 추가
              </>
            ) : (
              <>
                <MapPin size={16} color="var(--primary-light)" /> 장소 정보 입력
              </>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </div>

        {step === 'search' ? (
          <>
            {/* 검색 / 지도 선택 탭 */}
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'search' ? styles.tabBtnActive : ''}`}
                onClick={() => setMode('search')}
              >
                <Search size={13} />
                주소로 찾기
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'map' ? styles.tabBtnActive : ''}`}
                onClick={() => setMode('map')}
              >
                <Crosshair size={13} />
                지도에서 선택
              </button>
            </div>

            {mode === 'search' ? (
              <>
                <form className={styles.searchField} onSubmit={handleSearch}>
                  <Search size={15} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="주소나 장소명을 입력하고 Enter (예: 성수동 대림창고)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className={styles.searchSubmit} disabled={searching}>
                    {searching ? '검색 중…' : '검색'}
                  </button>
                </form>

                {error && <div className={styles.errorText}>{error}</div>}

                <div className={styles.resultList}>
                  {results.map((place, i) => (
                    <button
                      key={`${place.name}-${i}`}
                      className={styles.resultItem}
                      onClick={() => handleSelectResult(place)}
                      disabled={selecting}
                    >
                      <span className={styles.resultEmoji}>📍</span>
                      <div className={styles.resultInfo}>
                        <div className={styles.resultName}>{place.name}</div>
                        <div className={styles.resultAddress}>
                          {place.category ? `${place.category} · ${place.address}` : place.address}
                        </div>
                      </div>
                      <span className={styles.resultType}>{place.kind === 'address' ? '주소' : '장소'}</span>
                    </button>
                  ))}

                  {!searching && results.length === 0 && (
                    <div className={styles.emptyNotice}>
                      {query.trim()
                        ? '검색 결과가 없습니다. 지도에서 직접 선택해 보세요.'
                        : '주소나 장소명을 검색하거나, 지도에서 위치를 직접 선택하세요.'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <MiniMapPicker onPick={handlePick} />

                <div className={styles.pickedRow}>
                  <MapPin size={14} color="var(--primary-light)" />
                  <span className={styles.pickedAddress}>
                    {!picked
                      ? '지도를 클릭해 위치를 선택하세요'
                      : picked.loading
                        ? '주소를 확인하는 중…'
                        : picked.address}
                  </span>
                </div>

                <div className={`${styles.actions} ${styles.mapActions}`}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUsePicked}
                    disabled={!picked || picked.loading}
                    style={{ flex: 1 }}
                  >
                    이 위치로 선택
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className={styles.detailForm}>
            <div className={styles.selectedPlace}>
              <MapPin size={18} color="var(--primary-light)" />
              <div className={styles.selectedInfo}>
                <div className={styles.selectedName}>{name || selected?.address}</div>
                <div className={styles.selectedAddr}>{selected?.address}</div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>장소 이름</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 성수동 대림창고"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <Tag size={13} />
                카테고리 선택
              </label>
              <div className={styles.catGrid}>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.catOption} ${category === key ? styles.catOptionActive : ''}`}
                    onClick={() => setCategory(key)}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {!personal && (
              <label className={styles.recommendCheck}>
                <input type="checkbox" checked={recommend} onChange={e => setRecommend(e.target.checked)} />
                <span>
                  다녀와 봤어요 · 바로 추천하기
                  <small>가보고 싶어서 찍어두는 곳이면 체크하지 마세요. 다녀온 뒤 추천할 수 있어요.</small>
                </span>
              </label>
            )}

            {!personal && (
              <label className={styles.recommendCheck}>
                <input type="checkbox" checked={syncToPersonal} onChange={e => setSyncToPersonal(e.target.checked)} />
                <span>
                  내 지도에도 저장
                  <small>내 지도(개인 지도)에 같은 장소를 함께 담아둡니다.</small>
                </span>
              </label>
            )}

            {(personal || recommend) && (
              <div className={styles.field}>
                <label className={styles.label}>
                  <FileText size={13} />
                  {personal ? '메모 (선택)' : '팀원들에게 남길 한 줄 추천평 (선택)'}
                </label>
                <textarea
                  className={`input ${styles.textarea}`}
                  placeholder="예: 여기 시그니처 라떼가 진짜 맛있어요! 분위기도 조용함"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  maxLength={100}
                  rows={2}
                />
              </div>
            )}

            {personal && (
              <div className={styles.visibilityField}>
                <label className={styles.label}>공개 범위</label>
                <div className={styles.visibilityChips} role="group" aria-label="공개 범위">
                  {VISIBILITY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.visibilityChip} ${visibility === option.value ? styles.visibilityChipOn : ''}`}
                      onClick={() => setVisibility(option.value)}
                      aria-pressed={visibility === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className={styles.visibilityHint}>{VISIBILITY_HINT[visibility]}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('search')}>
                <ArrowLeft size={14} />
                다시 선택
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={adding} style={{ flex: 1 }}>
                <MapPin size={14} />
                {adding ? '꽂는 중…' : '지도에 핀 꽂기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 모달 안에서 위치를 고르는 작은 지도.
 * 클릭한 좌표를 부모에게 넘기고, 마커는 이 컴포넌트가 직접 관리한다.
 */
function MiniMapPicker({ onPick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    let cancelled = false

    loadKakaoMaps()
      .then(maps => {
        const el = containerRef.current
        if (cancelled || !el || mapRef.current) return

        const map = new maps.Map(el, {
          center: new maps.LatLng(PICKER_CENTER.lat, PICKER_CENTER.lng),
          level: PICKER_LEVEL,
        })
        mapRef.current = map

        maps.event.addListener(map, 'click', event => {
          const position = event.latLng
          if (markerRef.current) {
            markerRef.current.setPosition(position)
          } else {
            markerRef.current = new maps.Marker({ position, map })
          }
          onPickRef.current({ lat: position.getLat(), lng: position.getLng() })
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      markerRef.current = null
      mapRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  return (
    <div className={styles.pickerWrap}>
      <div ref={containerRef} className={styles.pickerMap} />
      <div className={styles.pickerHint}>지도를 클릭하면 그 위치의 주소를 가져옵니다</div>
    </div>
  )
}
