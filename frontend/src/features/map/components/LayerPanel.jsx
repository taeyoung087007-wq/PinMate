import { X, Layers, Check } from 'lucide-react'
import styles from './LayerPanel.module.css'

// 밝은 아바타 배경에는 어두운 글자색
function isLightColor(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}

/**
 * 지도 레이어 선택 패널
 * - 내 공개 핀(팀 지도에서만) 켜고 끄기
 * - 친구 목록에서 한 명을 골라 그 친구의 공개 핀을 겹쳐 보기
 */
export default function LayerPanel({
  friends = [],
  activeFriendId,
  showMine = false,
  showMineOption = false,
  onToggleMine,
  onSelectFriend,
  onClear,
  onClose,
}) {
  return (
    <div className={styles.panel} role="dialog" aria-label="지도 레이어">
      <div className={styles.header}>
        <span className={styles.title}>
          <Layers size={14} />
          레이어
        </span>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="레이어 닫기">
          <X size={14} />
        </button>
      </div>

      {showMineOption && (
        <button className={`${styles.row} ${showMine ? styles.rowActive : ''}`} onClick={onToggleMine}>
          <span className={styles.avatar} style={{ background: 'var(--primary)', color: '#fff' }}>나</span>
          <span className={styles.name}>내 공개 핀</span>
          <span className={styles.check}>{showMine && <Check size={14} />}</span>
        </button>
      )}

      <div className={styles.label}>친구 지도</div>
      {friends.length === 0 ? (
        <p className={styles.notice}>친구가 없습니다. 친구 탭에서 추가해 보세요.</p>
      ) : (
        friends.map(friend => {
          const active = String(friend.id) === String(activeFriendId)
          return (
            <button
              key={friend.id}
              className={`${styles.row} ${active ? styles.rowActive : ''}`}
              onClick={() => onSelectFriend?.(friend)}
            >
              <span
                className={styles.avatar}
                style={{
                  background: friend.avatarBg || 'var(--primary)',
                  color: isLightColor(friend.avatarBg) ? '#1a1a2e' : '#fff',
                }}
              >
                {(friend.nickname || friend.loginId || '?').slice(0, 1)}
              </span>
              <span className={styles.name}>{friend.nickname || friend.loginId}</span>
              <span className={styles.check}>{active && <Check size={14} />}</span>
            </button>
          )
        })
      )}

      {activeFriendId && (
        <button className={styles.clear} onClick={onClear}>친구 레이어 끄기</button>
      )}
    </div>
  )
}
