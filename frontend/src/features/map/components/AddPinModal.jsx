import { useState } from 'react'
import { X, Search, MapPin, Tag, FileText, PlusCircle, ArrowLeft } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { CURRENT_USER } from '../../../lib/currentUser'
import styles from './AddPinModal.module.css'

/** 기본 장소 검색 제안 데이터 */
const PLACE_SUGGESTIONS = [
  { name: '홍대 자이가르트', address: '서울 마포구 어울마당로 35', lat: 37.5557, lng: 126.9238, category: 'food' },
  { name: '익선동 낙원상가', address: '서울 종로구 낙원동 284', lat: 37.5752, lng: 126.9857, category: 'sight' },
  { name: '뚝섬 한강공원', address: '서울 광진구 강변북로 139', lat: 37.5299, lng: 127.0667, category: 'play' },
  { name: '성수동 대림창고', address: '서울 성동구 성수이로 78', lat: 37.5447, lng: 127.0568, category: 'cafe' },
  { name: '노량진 수산시장', address: '서울 동작구 노들로 674', lat: 37.5131, lng: 126.9432, category: 'food' },
  { name: '을지로 노가리골목', address: '서울 중구 을지로 11길 19', lat: 37.5661, lng: 126.9912, category: 'drink' },
  { name: '북촌 한옥마을', address: '서울 종로구 계동길 37', lat: 37.5826, lng: 126.9848, category: 'sight' },
]

/**
 * 장소 검색 및 지도 핀 추가 모달
 * - 장소 이름 검색
 * - 검색 결과 선택 또는 직접 장소명 입력 등록
 * - 카테고리 선택 및 한 줄 메모 작성
 */
export default function AddPinModal({ teamId, onClose, onAdd }) {
  const [step, setStep] = useState('search') // 'search' | 'detail'
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('food')
  const [memo, setMemo] = useState('')

  // 검색어 필터링
  const suggestions = PLACE_SUGGESTIONS.filter(p =>
    !query || p.name.includes(query) || p.address.includes(query)
  )

  // 추천 검색 결과 선택
  const handleSelect = (place) => {
    setSelected(place)
    setCategory(place.category || 'food')
    setStep('detail')
  }

  // 사용자가 직접 입력한 장소로 등록
  const handleCustomPlace = () => {
    if (!query.trim()) return
    // 서울 중심지 기준 약간의 랜덤 오프셋 부여
    const randomLat = 37.5665 + (Math.random() - 0.5) * 0.04
    const randomLng = 126.9780 + (Math.random() - 0.5) * 0.06
    setSelected({
      name: query.trim(),
      address: '서울 중심지 인근',
      lat: randomLat,
      lng: randomLng,
      category: 'food',
    })
    setCategory('food')
    setStep('detail')
  }

  // 핀 저장 제출
  const handleAdd = () => {
    if (!selected || !category) return
    // id, 추천자, 등록 시각 등은 서버가 채운다
    const newPin = {
      teamId,
      name: selected.name,
      address: selected.address,
      category,
      lat: selected.lat,
      lng: selected.lng,
      addedBy: CURRENT_USER.id,
      memo: memo.trim(),
    }
    onAdd(newPin)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} glass-card animate-slide-up`}>
        {/* 모달 상단 헤더 */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            {step === 'search' ? (
              <><Search size={16} color="var(--primary-light)" /> 장소 검색 및 추가</>
            ) : (
              <><MapPin size={16} color="var(--primary-light)" /> 장소 정보 입력</>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </div>

        {step === 'search' ? (
          <>
            <div className={styles.searchField}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="맛집, 카페, 명소 이름이나 주소를 입력..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* 직접 등록 옵션 배너 */}
            {query.trim().length > 0 && (
              <button
                type="button"
                className={styles.customAddBanner}
                onClick={handleCustomPlace}
              >
                <PlusCircle size={16} color="var(--primary-light)" />
                <div className={styles.customAddText}>
                  <span>"<strong>{query.trim()}</strong>"</span> (으)로 직접 핀 등록하기
                </div>
              </button>
            )}

            <div className={styles.resultList}>
              {suggestions.map((place, i) => {
                const meta = CATEGORY_META[place.category] || CATEGORY_META.etc
                return (
                  <button key={i} className={styles.resultItem} onClick={() => handleSelect(place)}>
                    <span className={styles.resultEmoji}>{meta.icon}</span>
                    <div className={styles.resultInfo}>
                      <div className={styles.resultName}>{place.name}</div>
                      <div className={styles.resultAddress}>{place.address}</div>
                    </div>
                    <span className={`badge ${meta.cls}`}>{meta.label}</span>
                  </button>
                )
              })}

              {suggestions.length === 0 && !query && (
                <div className={styles.emptyNotice}>
                  등록하고 싶은 장소 이름을 검색해보세요.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.detailForm}>
            {/* 선택된 장소 요약 */}
            <div className={styles.selectedPlace}>
              <MapPin size={18} color="var(--primary-light)" />
              <div>
                <div className={styles.selectedName}>{selected?.name}</div>
                <div className={styles.selectedAddr}>{selected?.address}</div>
              </div>
            </div>

            {/* 카테고리 선택 */}
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

            {/* 추천 한 줄 메모 */}
            <div className={styles.field}>
              <label className={styles.label}>
                <FileText size={13} />
                팀원들에게 남길 한 줄 추천평 (선택)
              </label>
              <textarea
                className={`input ${styles.textarea}`}
                placeholder="예: 여기 시그니처 라떼가 진짜 맛있어요! 분위기도 조용함"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                rows={2}
              />
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('search')}
              >
                <ArrowLeft size={14} />
                다시 검색
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAdd}
                style={{ flex: 1 }}
              >
                <MapPin size={14} />
                지도에 핀 꽂기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
