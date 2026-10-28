import { useState } from 'react'
import { X, Plus, Users, MapPin, Star, Link2, Check, ChevronRight } from 'lucide-react'
import TeamDetailView from './TeamDetailView'
import { parseInviteCode } from '../api'
import MemberAvatar from '../../../components/MemberAvatar/MemberAvatar'
import styles from './TeamDrawer.module.css'

/**
 * 모임 목록 & 전환 바텀시트
 */
export default function TeamDrawer({
  teams,
  activeTeamId,
  onSelectTeam,
  onOpenCreate,
  onJoinTeam,
  onLeftTeam,
  onClose,
  isOpen,
}) {
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [joining, setJoining] = useState(false)
  const [detailTeamId, setDetailTeamId] = useState(null) // 값이 있으면 모임 상세 화면

  if (!isOpen) return null

  // 다음에 열 때는 목록부터 보이도록 상세 상태를 초기화하고 닫는다
  const handleClose = () => {
    setDetailTeamId(null)
    onClose()
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setJoinError('초대 코드를 입력해주세요.')
      return
    }
    if (joining) return
    setJoining(true)
    try {
      await onJoinTeam(parseInviteCode(joinCode))
      setJoinCode('')
      setShowJoinInput(false)
      handleClose()
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={`${styles.drawer} glass-card animate-slide-up`} onClick={e => e.stopPropagation()}>
        {/* 드래그 핸들 (모바일) */}
        <div className={styles.dragHandle} />

        {detailTeamId ? (
          <TeamDetailView
            teamId={detailTeamId}
            onBack={() => setDetailTeamId(null)}
            onEnter={(id) => { onSelectTeam(id); handleClose() }}
            onLeft={(id) => { setDetailTeamId(null); onLeftTeam?.(id) }}
          />
        ) : (<>

        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>내 모임 목록</h3>
            <p className={styles.subtitle}>함께 장소를 공유할 모임을 선택하세요</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleClose} title="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 액션 버튼들 */}
        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={onOpenCreate} style={{ flex: 1 }}>
            <Plus size={16} />
            새 모임 만들기
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowJoinInput(prev => !prev)}
            title="초대 코드로 참여"
          >
            <Link2 size={16} />
            초대 코드
          </button>
        </div>

        {/* 초대 코드 입력 창 */}
        {showJoinInput && (
          <form onSubmit={handleJoinSubmit} className={styles.joinBox}>
            <input
              className="input"
              placeholder="초대 코드 또는 링크 입력..."
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError('') }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 14px' }} disabled={joining}>
              {joining ? '참여 중...' : '참여'}
            </button>
            {joinError && <div className={styles.errorText}>{joinError}</div>}
          </form>
        )}

        {/* 모임 리스트 */}
        <div className={styles.teamList}>
          {teams.map(team => {
            const isSelected = String(team.id) === String(activeTeamId)
            const hasEmoji = /^\p{Extended_Pictographic}/u.test(team.name)
            const emoji = hasEmoji ? team.name.slice(0, 2) : '📍'
            const title = hasEmoji ? team.name.slice(2).trim() : team.name

            return (
              <div
                key={team.id}
                className={`${styles.teamCard} ${isSelected ? styles.teamCardActive : ''}`}
                onClick={() => setDetailTeamId(team.id)}
              >
                <div className={styles.teamEmoji}>{emoji}</div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamNameRow}>
                    <span className={styles.teamName}>{title}</span>
                    {isSelected && <span className={styles.activeTag}>선택됨</span>}
                  </div>
                  <div className={styles.teamStats}>
                    <span className={styles.stat}>
                      <Users size={12} />
                      {team.memberCount || team.members?.length || 0}명
                    </span>
                    <span className={styles.stat}>
                      <MapPin size={12} />
                      핀 {team.pinCount || 0}개
                    </span>
                    {team.allApprovedCount > 0 && (
                      <span className={styles.statGold}>
                        <Star size={11} fill="var(--warning)" />
                        인정 {team.allApprovedCount}곳
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.teamMembersPreview}>
                  {(team.members || []).slice(0, 3).map((m) => (
                    <MemberAvatar key={m.id} member={m} className={styles.avatar} title={m.nickname} />
                  ))}
                  <ChevronRight size={16} className={styles.arrow} />
                </div>
              </div>
            )
          })}

          {teams.length === 0 && (
            <div className={styles.emptyState}>
              <p>아직 참여 중인 모임이 없습니다.</p>
              <button className="btn btn-primary" onClick={onOpenCreate} style={{ marginTop: '12px' }}>
                첫 모임 만들기
              </button>
            </div>
          )}
        </div>
        </>)}
      </div>
    </div>
  )
}
