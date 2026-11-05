import { useState } from 'react'
import { usePanelDrag } from '../../../lib/usePanelDrag'
import { X, MapPin, Star, Check, ExternalLink, Clock, Pencil, Trash2, Save, Navigation, Plus, MessageSquare } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import { isMajority, memberRecommendCount } from '../consensus'
import { getCurrentUser } from '../../../lib/currentUser'
import MemberAvatar from '../../../components/MemberAvatar/MemberAvatar'
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
 * - 추천인별 한 줄 평. 추천한 사람은 자기 평을 남기거나 고칠 수 있다
 * - 팀원 과반이 추천하면 과반 인정, 모임 기준(전원 또는 N명 이상)을 채우면 모두 인정
 * - 등록자·팀 owner·admin 에게만 수정/삭제 버튼 노출
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
  team: '이 모임 지도에만 보여요.',
  all: '친구와 모임 모두 볼 수 있어요.',
}

export default function PinDetailPanel({
  pin,
  members,
  personal = false,
  overlay = false,
  hasPersonalCopy = false,
  ownerName,
  onAddToMyMap,
  alreadyAdded = false,
  onClose,
  onRecommend,
  onUpdate,
  onSaveComment,
  onDelete,
  onRoute,
  onSetVisibility,
  onUnshare,
}) {
  // 하단 시트: 그랩 핸들을 아래로 쓸면 닫는다 (중앙 정렬 transform 은 유지)
  const { panelRef, handleRef } = usePanelDrag(onClose, { axis: 'y', sign: 1, baseTransform: 'translateX(-50%)' })

  const meta = CATEGORY_META[pin.category] || CATEGORY_META.etc
  const addedByMember = members.find(m => m.id === pin.addedBy)

  // 로그인 직후에도 최신 값을 쓰도록 렌더 시점에 읽는다 (모듈 상수는 로그인 전 값으로 고정된다)
  const me = getCurrentUser()
  const myMember = members.find(m => m.id === me.loginId)
  const recommenders = pin.recommenders ?? []   // 친구 지도 핀은 추천 개념이 없어 비어 있을 수 있다
  const isMeRecommended = recommenders.includes(myMember?.id ?? me.loginId)
  const createdAtText = formatCreatedAt(pin.createdAt)
  const recommendCount = memberRecommendCount(pin, members)
  // 한 줄 추천평은 등록자의 추천에 붙는다. 등록자가 아직 추천하지 않았으면 고칠 추천평이 없다
  const creatorRecommended = recommenders.includes(pin.addedBy)
  // 등록자 평은 위의 memo 로 보여주고 수정 모드에서 고치므로, 아래 목록·입력은 다른 추천인 것만
  const comments = pin.comments ?? {}
  const commentMembers = members.filter(m => comments[m.id] && m.id !== pin.addedBy)
  const myKey = myMember?.id ?? me.loginId
  const canComment = Boolean(onSaveComment) && isMeRecommended && myKey !== pin.addedBy

  // 등록자 본인 또는 팀 owner·admin 만 수정·삭제할 수 있다 (서버에서도 같은 규칙으로 검사한다)
  const canEdit = Boolean(onUpdate || onDelete) &&
    (pin.addedBy === me.loginId || myMember?.role === 'owner' || myMember?.role === 'admin')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: '', memo: '' })
  const [deletePrompt, setDeletePrompt] = useState(false) // 모임 지도 위 오버레이 핀 삭제 선택
  const [teamDeletePrompt, setTeamDeletePrompt] = useState(false) // 모임 핀 삭제 + 내 지도에도 있는 경우
  const [recommendPrompt, setRecommendPrompt] = useState(false) // 추천 취소 + 내 지도에도 있는 경우
  // 내 한 줄 평 입력 중이면 { pinId, text }. 다른 핀으로 바뀌면 입력창을 닫은 것으로 본다 (남의 핀에 저장되지 않게)
  const [commentDraft, setCommentDraft] = useState(null)
  const commentOpen = commentDraft?.pinId === pin.id

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

  const handleSaveComment = async () => {
    if (saving) return
    setSaving(true)
    const ok = await onSaveComment?.(commentDraft.text.trim())
    setSaving(false)
    if (ok !== false) setCommentDraft(null)
  }

  const handleDelete = () => {
    // 모임 지도 위에 겹쳐 보이는 내 핀이면 '내 지도에서도 삭제' vs '공유만 해제'를 고르게 한다
    if (overlay) {
      setDeletePrompt(true)
      return
    }
    // 모임 핀인데 내 지도에도 같은 장소가 있으면, 함께 지울지 먼저 묻는다
    if (!personal && hasPersonalCopy) {
      setTeamDeletePrompt(true)
      return
    }
    // 실수로 지우는 것을 막기 위해 한 번 확인한다
    const message = personal
      ? `'${pin.name}' 장소를 내 지도에서 삭제할까요?`
      : `'${pin.name}' 장소를 삭제할까요? 추천 기록도 함께 사라집니다.`
    if (!window.confirm(message)) return
    onDelete?.(pin.id)
  }

  // 추천 취소도 내 지도에 같은 장소가 있으면 함께 지울지 묻는다
  const handleRecommendClick = () => {
    if (isMeRecommended && hasPersonalCopy) {
      setRecommendPrompt(true)
      return
    }
    onRecommend?.()
  }

  // 카카오맵 검색 새 탭 열기
  const handleOpenKakaoMap = () => {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(pin.name)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={panelRef} className={`${styles.panel} glass-card animate-slide-up`}>
      {/* 드래그 핸들: 아래로 쓸어 내려 닫는다 */}
      <div className={styles.dragStrip} ref={handleRef} aria-hidden="true">
        <span className={styles.grabber} />
      </div>
      {/* 상단 헤더: 카테고리 뱃지 & 모두 인정 뱃지 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`badge ${meta.cls}`}>
            {meta.icon} {meta.label}
          </span>
          {!personal && pin.isAllApproved && (
            <span className="badge badge-gold">
              ⭐ 모두 인정{pin.consensusMemberCount ? ` · ${pin.consensusMemberCount}명` : ''}
            </span>
          )}
          {!personal && isMajority(pin, members) && (
            <span className="badge">👍 과반 인정 · {recommendCount}/{members.length}명</span>
          )}
          {/* 팀원이 늘어 배지가 풀린 경우: 그때 몇 명이 모두 인정했는지 남겨 보여준다 */}
          {!personal && !pin.isAllApproved && pin.consensusMemberCount > 0 && (
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
              <label className={styles.fieldLabel}>{personal ? '메모' : '한 줄 추천평'}</label>
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

          {/* 내 지도 공개 범위: 고른 대상에게만 핀이 보인다 */}
          {personal && onSetVisibility && (
            <div className={styles.visibilityBlock}>
              <div className={styles.visibilityLabel}>공개 범위</div>
              <div className={styles.visibilityChips} role="group" aria-label="공개 범위">
                {VISIBILITY_OPTIONS.map(option => {
                  const current = pin.visibility || (pin.isPublic ? 'all' : 'private')
                  const active = current === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.visibilityChip} ${active ? styles.visibilityChipOn : ''}`}
                      onClick={() => onSetVisibility(option.value)}
                      aria-pressed={active}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className={styles.visibilityHint}>
                {VISIBILITY_HINT[pin.visibility || (pin.isPublic ? 'all' : 'private')]}
              </p>
            </div>
          )}

          {/* 추천한 멤버 섹션 (팀 지도에서만) */}
          {!personal && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                <Star size={13} />
                추천한 멤버 ({recommendCount}/{members.length}명)
              </div>
              <div className={styles.recommenders}>
                {members.map(m => {
                  const didRecommend = recommenders.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`${styles.recommenderItem} ${!didRecommend ? styles.recommenderInactive : ''}`}
                      title={`${m.nickname} ${didRecommend ? '(추천함)' : '(미추천)'}`}
                    >
                      <MemberAvatar member={m} className={styles.recommenderAvatar} muted={!didRecommend} />
                      <span className={styles.recommenderName}>{m.nickname}</span>
                      {didRecommend && <Check size={12} color="var(--success)" />}
                    </div>
                  )
                })}
              </div>

              {/* 추천인별 한 줄 평 */}
              {commentMembers.length > 0 && (
                <ul className={styles.comments}>
                  {commentMembers.map(m => (
                    <li key={m.id} className={styles.commentItem}>
                      <span className={styles.commentAuthor}>{m.nickname}</span>
                      {comments[m.id]}
                    </li>
                  ))}
                </ul>
              )}

              {canComment && (commentOpen ? (
                <div className={styles.field}>
                  <textarea
                    className={`input ${styles.memoInput}`}
                    value={commentDraft.text}
                    onChange={e => setCommentDraft({ pinId: pin.id, text: e.target.value })}
                    maxLength={100}
                    rows={2}
                    placeholder="예: 다음엔 저녁에 또 가고 싶어요"
                    aria-label="내 한 줄 평"
                    autoFocus
                  />
                  <div className={styles.actions}>
                    <button className="btn btn-primary" onClick={handleSaveComment} disabled={saving}>
                      <Save size={15} />
                      {saving ? '저장 중…' : '저장'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setCommentDraft(null)} disabled={saving}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`btn btn-ghost ${styles.commentBtn}`}
                  onClick={() => setCommentDraft({ pinId: pin.id, text: comments[myKey] || '' })}
                >
                  <MessageSquare size={14} />
                  {comments[myKey] ? '내 한 줄 평 수정' : '한 줄 평 남기기'}
                </button>
              ))}
            </div>
          )}

          {/* 최초 등록자 정보 */}
          <div className={styles.addedBy}>
            {personal
              ? <div className={styles.addedByAvatar} style={{ background: 'var(--primary)' }}>{(ownerName || '나').slice(0, 1)}</div>
              : (addedByMember
                ? <MemberAvatar member={addedByMember} className={styles.addedByAvatar} />
                : <div className={styles.addedByAvatar} style={{ background: 'var(--primary)' }}>팀</div>)}
            <span>
              {personal
                ? (ownerName ? `${ownerName}님이 저장한 장소` : '내가 저장한 장소')
                : `${addedByMember?.nickname || '팀원'}님이 처음 등록`}
            </span>
            {createdAtText && (
              <span className={styles.addedByDate}>
                <Clock size={11} />
                {createdAtText}
              </span>
            )}
          </div>

          {/* 모임 지도 위 오버레이 핀 삭제: 내 지도에서도 지울지, 공유만 해제할지 고른다 */}
          {deletePrompt && (
            <div className={styles.deletePrompt}>
              <p className={styles.deletePromptText}>모임 지도에서 이 핀을 뺍니다. 내 지도에서도 삭제할까요?</p>
              <div className={styles.deletePromptActions}>
                <button
                  className="btn btn-danger"
                  onClick={() => { setDeletePrompt(false); onDelete?.(pin.id) }}
                >
                  내 지도에서도 삭제
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setDeletePrompt(false); onUnshare?.() }}
                >
                  공유만 해제
                </button>
                <button className="btn btn-ghost" onClick={() => setDeletePrompt(false)}>취소</button>
              </div>
            </div>
          )}

          {/* 모임 핀 삭제: 내 지도에도 같은 장소가 있으면 함께 지울지 고른다 */}
          {teamDeletePrompt && (
            <div className={styles.deletePrompt}>
              <p className={styles.deletePromptText}>
                모임에서 이 장소를 삭제합니다. 내 지도에도 같은 장소가 있어요. 함께 삭제할까요?
              </p>
              <div className={styles.deletePromptActions}>
                <button
                  className="btn btn-danger"
                  onClick={() => { setTeamDeletePrompt(false); onDelete?.(pin.id, { deletePersonal: true }) }}
                >
                  내 지도에서도 삭제
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setTeamDeletePrompt(false); onDelete?.(pin.id) }}
                >
                  모임에서만 삭제
                </button>
                <button className="btn btn-ghost" onClick={() => setTeamDeletePrompt(false)}>취소</button>
              </div>
            </div>
          )}

          {/* 추천 취소: 내 지도에도 같은 장소가 있으면 함께 지울지 고른다 */}
          {recommendPrompt && (
            <div className={styles.deletePrompt}>
              <p className={styles.deletePromptText}>
                추천을 취소합니다. 내 지도에도 같은 장소가 있어요. 함께 삭제할까요?
              </p>
              <div className={styles.deletePromptActions}>
                <button
                  className="btn btn-danger"
                  onClick={() => { setRecommendPrompt(false); onRecommend?.({ deletePersonal: true }) }}
                >
                  함께 삭제
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setRecommendPrompt(false); onRecommend?.() }}
                >
                  추천만 취소
                </button>
                <button className="btn btn-ghost" onClick={() => setRecommendPrompt(false)}>취소</button>
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className={styles.actions}>
            {/* 친구 지도 핀은 읽기 전용 — 내 지도에 추가할 수 있다 */}
            {personal && ownerName && onAddToMyMap && (
              <button
                className="btn btn-primary"
                onClick={onAddToMyMap}
                disabled={alreadyAdded}
                style={{ flex: 1 }}
              >
                <Plus size={15} />
                {alreadyAdded ? '내 지도에 있음' : '내 지도에 추가'}
              </button>
            )}
            {!personal && (
              <button
                className={`btn ${isMeRecommended ? 'btn-danger' : 'btn-primary'} ${styles.recommendBtn}`}
                onClick={handleRecommendClick}
                title="다녀와 보고 좋았으면 추천해 주세요"
              >
                <Star size={15} fill={isMeRecommended ? 'var(--danger)' : 'white'} />
                {isMeRecommended ? '추천 취소' : '다녀왔어요 · 추천하기'}
              </button>
            )}
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
