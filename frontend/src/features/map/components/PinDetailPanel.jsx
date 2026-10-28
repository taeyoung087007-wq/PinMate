import { useState } from 'react'
import { X, MapPin, Star, Check, ExternalLink, Clock, Pencil, Trash2, Save, Navigation } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { isMajority, memberRecommendCount } from '../consensus'
import { getCurrentUser } from '../../../lib/currentUser'
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
 * - 추천인 목록 및 추천 수 (추천 = 다녀와 보고 좋았던 곳. 찍어두기만 한 장소는 0명일 수 있다)
 * - 팀원 과반이 추천하면 과반 인정, 전원이면 모두 인정
 * - 등록자·팀 owner 에게만 수정/삭제 버튼 노출
 */
export default function PinDetailPanel({
  pin,
  members,
  onClose,
  onRecommend,
  onUpdate,
  onDelete,
  onRoute,
}) {
  const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
  const addedByMember = members.find(m => m.id === pin.addedBy)

  // 로그인 직후에도 최신 값을 쓰도록 렌더 시점에 읽는다 (모듈 상수는 로그인 전 값으로 고정된다)
  const me = getCurrentUser()
  const myMember = members.find(m => m.id === me.loginId)
  const isMeRecommended = pin.recommenders.includes(myMember?.id ?? me.loginId)
  const createdAtText = formatCreatedAt(pin.createdAt)
  const recommendCount = memberRecommendCount(pin, members)
  // 한 줄 추천평은 등록자의 추천에 붙는다. 등록자가 아직 추천하지 않았으면 고칠 추천평이 없다
  const creatorRecommended = pin.recommenders.includes(pin.addedBy)

  // 등록자 본인 또는 팀 owner 만 수정·삭제할 수 있다 (서버에서도 같은 규칙으로 검사한다)
  const canEdit = Boolean(onUpdate || onDelete) &&
    (pin.addedBy === me.loginId || myMember?.role === 'owner')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: '', memo: '' })

  const startEdit = () => {
    setDraft({ name: pin.name, category: pin.category, memo: pin.memo || '' })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!draft.name.trim() || saving) return
    setSaving(true)
    const ok = await onUpdate?.(pin.id, {
      name: draft.name.trim(),
      category: draft.category,
      ...(creatorRecommended && { memo: draft.memo.trim() }),
    })
    setSaving(false)
    if (ok !== false) setEditing(false)
  }

  const handleDelete = () => {
    // 실수로 지우는 것을 막기 위해 한 번 확인한다
    if (!window.confirm(`'${pin.name}' 장소를 삭제할까요? 추천 기록도 함께 사라집니다.`)) return
    onDelete?.(pin.id)
  }

  // 카카오맵 검색 새 탭 열기
  const handleOpenKakaoMap = () => {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(pin.name)}`
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
            <span className="badge badge-gold">
              ⭐ 모두 인정{pin.consensusMemberCount ? ` · ${pin.consensusMemberCount}명` : ''}
            </span>
          )}
          {isMajority(pin, members) && (
            <span className="badge">👍 과반 인정 · {recommendCount}/{members.length}명</span>
          )}
          {/* 팀원이 늘어 배지가 풀린 경우: 그때 몇 명이 모두 인정했는지 남겨 보여준다 */}
          {!pin.isAllApproved && pin.consensusMemberCount > 0 && (
            <span className="badge">🏅 {pin.consensusMemberCount}명 달성</span>
          )}
        </div>
        <div className={styles.headerActions}>
          {canEdit && !editing && (
            <>
              <button
                className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                onClick={startEdit}
                title="장소 정보 수정"
              >
                <Pencil size={15} />
              </button>
              <button
                className={`btn btn-ghost btn-icon ${styles.iconBtn} ${styles.deleteBtn}`}
                onClick={handleDelete}
                title="장소 삭제"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          <button className={`btn btn-ghost btn-icon ${styles.closeBtn}`} onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <>
          {/* 수정 모드: 이름 · 카테고리 · 추천평 */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>장소 이름</label>
            <input
              className="input"
              value={draft.name}
              onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
              maxLength={100}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>카테고리</label>
            <div className={styles.catGrid}>
              {Object.entries(CATEGORY_META).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.catChip} ${draft.category === key ? styles.catChipActive : ''}`}
                  onClick={() => setDraft(prev => ({ ...prev, category: key }))}
                >
                  <span>{value.icon}</span>
                  <span>{value.label}</span>
                </button>
              ))}
            </div>
          </div>

          {creatorRecommended && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>한 줄 추천평</label>
              <textarea
                className={`input ${styles.memoInput}`}
                value={draft.memo}
                onChange={e => setDraft(prev => ({ ...prev, memo: e.target.value }))}
                maxLength={100}
                rows={2}
                placeholder="예: 여기 시그니처 라떼가 진짜 맛있어요"
              />
            </div>
          )}

          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !draft.name.trim()}>
              <Save size={15} />
              {saving ? '저장 중…' : '저장'}
            </button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
              취소
            </button>
          </div>
        </>
      ) : (
        <>
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
              추천한 멤버 ({recommendCount}/{members.length}명)
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
              title="다녀와 보고 좋았으면 추천해 주세요"
            >
              <Star size={15} fill={isMeRecommended ? 'var(--danger)' : 'white'} />
              {isMeRecommended ? '추천 취소' : '다녀왔어요 · 추천하기'}
            </button>
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => onRoute?.(pin)}
              title="내 위치에서 길찾기"
              aria-label="내 위치에서 길찾기"
            >
              <Navigation size={16} />
            </button>
            <button
              className="btn btn-secondary btn-icon"
              onClick={handleOpenKakaoMap}
              title="카카오맵에서 보기"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
