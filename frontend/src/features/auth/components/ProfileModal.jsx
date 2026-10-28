import { X, LogOut, User, Mail } from 'lucide-react'
import styles from './ProfileModal.module.css'

export default function ProfileModal({ isOpen, onClose, onLogout, currentUser }) {
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
            {currentUser.email && (
              <div className={styles.email}>
                <Mail size={12} />
                {currentUser.email}
              </div>
            )}
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
