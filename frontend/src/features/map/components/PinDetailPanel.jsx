import { X, MapPin, Star, Navigation, Heart, Check, ExternalLink, Clock } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { CURRENT_USER } from '../../../lib/currentUser'
import styles from './PinDetailPanel.module.css'

/**
 * 등록일 표시용 포맷. 백엔드는 createdAt(ISO 문자열)으로 내려준다.
 * 값이 없거나 형식이 깨졌으면 빈 문자열을 돌려줘 날짜 줄 자체를 숨긴다.
 */
function formatCreatedAt(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

/**
 * 장소 상세 정보 슬라이드업 패널
 * - 장소 이름, 주소, 카테고리
 * - 추천인 목록 및 추천 수
 * - 방문 여부 표시 및 토글
 * - '나도 추천' 및 '네이버 지도 바로가기'
 */
export default function PinDetailPanel({ pin, members, onClose, onRecommend, onToggleVisit }) {
  const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
  const addedByMember = members.find(m => m.id === pin.addedBy)
  const isMeRecommended = pin.recommenders.includes(CURRENT_USER.id)
  const isMeVisited = (pin.visitedBy || []).includes(CURRENT_USER.id)
  const createdAtText = formatCreatedAt(pin.createdAt)

  // 네이버 지도 검색 새 탭 열기
  const handleOpenNaverMap = () => {
    const url = `https://map.naver.com/p/search/${encodeURIComponent(pin.name)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`${styles.panel} glass-card animate-slide-up`}>
      {/* 상단 헤더: 카테고리 뱃지 & 모두 인정 뱃지 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`badge ${meta.cls}`}>
            {meta.icon} {meta.label}
          </span>
          {pin.isAllApproved && (
            <span className="badge badge-gold">⭐ 모두 인정</span>
          )}
        </div>
        <button className={`btn btn-ghost btn-icon ${styles.closeBtn}`} onClick={onClose} title="닫기">
          <X size={16} />
        </button>
      </div>

      {/* 장소명 & 주소 */}
      <div className={styles.title}>{pin.name}</div>
      <div className={styles.address}>
        <MapPin size={13} />
        <span>{pin.address}</span>
      </div>

      {/* 등록자 한 줄 메모 */}
      {pin.memo && (
        <div className={styles.memo}>
          <span className={styles.memoQuote}>"</span>
          {pin.memo}
          <span className={styles.memoQuote}>"</span>
        </div>
      )}

      {/* 추천한 멤버 섹션 */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <Star size={13} />
          추천한 멤버 ({pin.recommenders.length}/{members.length}명)
        </div>
        <div className={styles.recommenders}>
          {members.map(m => {
            const didRecommend = pin.recommenders.includes(m.id)
            return (
              <div
                key={m.id}
                className={`${styles.recommenderItem} ${!didRecommend ? styles.recommenderInactive : ''}`}
                title={`${m.nickname} ${didRecommend ? '(추천함)' : '(미추천)'}`}
              >
                <div
                  className={styles.recommenderAvatar}
                  style={{ background: didRecommend ? m.avatarColor : 'var(--bg-hover)' }}
                >
                  {m.initials}
                </div>
                <span className={styles.recommenderName}>{m.nickname}</span>
                {didRecommend && <Check size={12} color="var(--success)" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* 방문한 멤버 섹션 및 방문 토글 */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <Check size={13} />
          방문 현황 ({(pin.visitedBy || []).length}명 다녀감)
        </div>
        <div className={styles.visitedRow}>
          <div className={styles.visitedList}>
            {(pin.visitedBy || []).length === 0 ? (
              <span className={styles.emptyVisited}>아직 방문한 멤버가 없어요</span>
            ) : (
              (pin.visitedBy || []).map(uid => {
                const m = members.find(mem => mem.id === uid)
                return m ? (
                  <span
                    key={uid}
                    className={styles.visitedBadge}
                    style={{ borderColor: m.avatarColor + '60', color: m.avatarColor }}
                  >
                    {m.initials} {m.nickname}
                  </span>
                ) : null
              })
            )}
          </div>
          {onToggleVisit && (
            <button
              className={`btn ${isMeVisited ? 'btn-secondary' : 'btn-ghost'} ${styles.visitCheckBtn}`}
              onClick={onToggleVisit}
              title="내가 다녀왔는지 체크"
            >
              <Check size={13} color={isMeVisited ? 'var(--success)' : 'currentColor'} />
              {isMeVisited ? '방문 완료' : '다녀왔어요'}
            </button>
          )}
        </div>
      </div>

      {/* 최초 등록자 정보 */}
      <div className={styles.addedBy}>
        <div
          className={styles.addedByAvatar}
          style={{ background: addedByMember?.avatarColor || 'var(--primary)' }}
        >
          {addedByMember?.initials || '팀'}
        </div>
        <span>{addedByMember?.nickname || '팀원'}님이 처음 등록</span>
        {createdAtText && (
          <span className={styles.addedByDate}>
            <Clock size={11} />
            {createdAtText}
          </span>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className={styles.actions}>
        <button
          className={`btn ${isMeRecommended ? 'btn-danger' : 'btn-primary'} ${styles.recommendBtn}`}
          onClick={onRecommend}
        >
          <Star size={15} fill={isMeRecommended ? 'var(--danger)' : 'white'} />
          {isMeRecommended ? '추천 취소' : '나도 추천하기!'}
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={handleOpenNaverMap}
          title="네이버 지도에서 보기"
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  )
}
