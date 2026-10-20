import { X, LogOut, User, Mail, Shield, Sparkles } from 'lucide-react'
import { CURRENT_USER } from '../../../lib/currentUser'
import styles from './ProfileModal.module.css'

const TEST_USERS = [
  { id: 'user-1', nickname: '김태영', email: 'taeyoung@pinmate.io', avatarColor: '#6C63FF', initials: '김' },
  { id: 'user-2', nickname: '이민지', email: 'minji@pinmate.io', avatarColor: '#FF6B6B', initials: '이' },
  { id: 'user-3', nickname: '박준호', email: 'junho@pinmate.io', avatarColor: '#4CC9F0', initials: '박' },
  { id: 'user-4', nickname: '정소연', email: 'soyeon@pinmate.io', avatarColor: '#06D6A0', initials: '정' },
]

export default function ProfileModal({ isOpen, onClose, onLogout, currentUser, onChangeUser }) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-card animate-scale-up`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <User size={18} color="var(--primary-light)" />
            내 프로필
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 현재 사용자 카드 */}
        <div className={styles.userCard}>
          <div className={styles.avatar} style={{ background: currentUser.avatarColor }}>
            {currentUser.initials}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.nickname}>{currentUser.nickname}</div>
            <div className={styles.email}>
              <Mail size={12} />
              {currentUser.email}
            </div>
          </div>
        </div>

        {/* 테스트용 사용자 전환 칩 */}
        <div className={styles.testSection}>
          <div className={styles.testTitle}>
            <Sparkles size={13} color="var(--warning)" />
            팀원 시뮬레이션 전환 (추천 테스트용)
          </div>
          <div className={styles.userChips}>
            {TEST_USERS.map(u => {
              const isCurrent = u.id === currentUser.id
              return (
                <button
                  key={u.id}
                  className={`${styles.userChip} ${isCurrent ? styles.userChipActive : ''}`}
                  onClick={() => onChangeUser(u)}
                >
                  <span className={styles.chipDot} style={{ background: u.avatarColor }} />
                  {u.nickname}
                </button>
              )
            })}
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <div className={styles.footer}>
          <button className="btn btn-secondary" onClick={onLogout} style={{ width: '100%', gap: '8px', color: 'var(--danger)' }}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
