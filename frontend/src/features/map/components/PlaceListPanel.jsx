import { X, MapPin, Star, Users, ChevronRight } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { isMajority } from '../consensus'
import MemberAvatar from '../../../components/MemberAvatar/MemberAvatar'
import styles from './PlaceListPanel.module.css'

/**
 * 팀 장소 사이드 목록 패널
 * - '모두 인정한 장소' 그룹 우선 정렬 표시
 * - 추천 수 높은 순으로 정렬
 * - 장소 클릭 시 지도의 해당 핀으로 포커스
 */
export default function PlaceListPanel({ pins, members, onSelectPin, onClose }) {
  // '모두 인정' 장소와 일반 장소 분리 정렬
  const approved = pins.filter(p => p.isAllApproved)
  const rest = pins
    .filter(p => !p.isAllApproved)
    .sort((a, b) => b.recommenders.length - a.recommenders.length)

  return (
    <div className={`${styles.panel} glass-card animate-fade-in`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <MapPin size={16} color="var(--primary-light)" />
          장소 목록
          <span className={styles.count}>{pins.length}</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="목록 닫기">
          <X size={15} />
        </button>
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

        {pins.length === 0 && (
          <div className={styles.empty}>
            <span>🗺️</span>
            <span>아직 등록된 장소가 없습니다</span>
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
