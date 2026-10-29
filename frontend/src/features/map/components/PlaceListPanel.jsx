import { useMemo, useState } from 'react'
import { usePanelDrag } from '../../../lib/usePanelDrag'
import { X, MapPin, Star, Search } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { isMajority } from '../consensus'
import { SORTS, filterAndSortPins } from '../placeList'
import MemberAvatar from '../../../components/MemberAvatar/MemberAvatar'
import styles from './PlaceListPanel.module.css'

/**
 * 팀 장소 사이드 목록 패널
 * - 검색(이름·주소)과 정렬(추천순·최신순·이름순)
 * - '모두 인정한 장소' 그룹을 항상 위에 표시
 * - 장소 클릭 시 지도의 해당 핀으로 포커스
 */
export default function PlaceListPanel({ pins, members, onSelectPin, onClose, emptyMessage }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommend')

  // 우측 사이드 시트: 그랩 핸들을 오른쪽으로 쓸면 닫는다
  const { panelRef, handleRef } = usePanelDrag(onClose, { axis: 'x', sign: 1 })

  const { approved, rest, total } = useMemo(
    () => filterAndSortPins(pins, { query, sort }),
    [pins, query, sort]
  )

  return (
    <div ref={panelRef} className={`${styles.panel} glass-card animate-fade-in`}>
      {/* 드래그 핸들: 오른쪽으로 쓸어 닫는다 */}
      <div className={styles.dragStrip} ref={handleRef} aria-hidden="true">
        <span className={styles.grabber} />
      </div>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <MapPin size={16} color="var(--primary-light)" />
          장소 목록
          <span className={styles.count}>{total}</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="목록 닫기">
          <X size={15} />
        </button>
      </div>

      {/* 검색 + 정렬 */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={13} color="var(--text-muted)" />
          <input
            className={styles.searchInput}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="장소 이름·주소 검색"
            aria-label="장소 검색"
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')} aria-label="검색어 지우기">
              <X size={12} />
            </button>
          )}
        </div>

        <div className={styles.sorts} role="group" aria-label="정렬">
          {SORTS.map(option => (
            <button
              key={option.key}
              className={`${styles.sortBtn} ${sort === option.key ? styles.sortActive : ''}`}
              onClick={() => setSort(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {/* 모두 인정받은 장소 그룹 */}
        {approved.length > 0 && (
          <>
            <div className={styles.groupLabel}>
              <Star size={11} fill="var(--warning)" color="var(--warning)" />
              모두 인정한 장소 ({approved.length})
            </div>
            {approved.map(pin => (
              <PinRow key={pin.id} pin={pin} members={members} onClick={() => onSelectPin(pin)} />
            ))}
          </>
        )}

        {/* 일반 등록 장소 그룹 */}
        {rest.length > 0 && (
          <>
            <div className={styles.groupLabel}>
              <MapPin size={11} />
              전체 장소 ({rest.length})
            </div>
            {rest.map(pin => (
              <PinRow key={pin.id} pin={pin} members={members} onClick={() => onSelectPin(pin)} />
            ))}
          </>
        )}

        {total === 0 && (
          <div className={styles.empty}>
            <span>{query.trim() ? '🔍' : '🗺️'}</span>
            <span>{query.trim() ? '검색 결과가 없습니다' : (emptyMessage ?? '아직 등록된 장소가 없습니다')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function PinRow({ pin, members, onClick }) {
  const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
  return (
    <button className={styles.pinRow} onClick={onClick}>
      <span className={styles.pinEmoji}>{meta.icon}</span>
      <div className={styles.pinInfo}>
        <div className={styles.pinName}>{pin.name}</div>
        <div className={styles.pinAddress}>{pin.address}</div>
      </div>
      <div className={styles.pinMeta}>
        <div className={styles.pinAvatars}>
          {pin.recommenders.map(uid => {
            const m = members.find(m => m.id === uid)
            return m ? (
              <MemberAvatar key={uid} member={m} className={styles.pinAvatar} title={`${m.nickname} 추천`} />
            ) : null
          })}
        </div>
        {pin.isAllApproved && <span style={{ fontSize: '14px' }} title="모두 인정">⭐</span>}
        {isMajority(pin, members) && <span style={{ fontSize: '14px' }} title="과반 인정">👍</span>}
      </div>
    </button>
  )
}
