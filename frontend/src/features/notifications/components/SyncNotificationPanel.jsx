import { X, Bell, Plus, Trash2, Check } from 'lucide-react'
import styles from './SyncNotificationPanel.module.css'

const formatTime = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 팀별로 묶고, 처리 안 한 알림을 위로 올린다
function groupByTeam(items) {
  const groups = new Map()
  items.forEach(item => {
    const key = item.teamId
    if (!groups.has(key)) groups.set(key, { teamId: key, teamName: item.teamName || '모임', items: [] })
    groups.get(key).items.push(item)
  })
  return [...groups.values()].map(group => ({
    ...group,
    items: [...group.items].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')),
    pendingCount: group.items.filter(i => i.status === 'pending').length,
  }))
}

/**
 * 동기화 알림 (F-71, F-72)
 * - 다른 팀원이 장소를 추가·삭제한 내역을 모임별로 보여준다
 * - 항목별 '내 지도에 담기'(추가) / '내 지도에서 삭제'(삭제) / '무시', 모임 단위 모두 반영·모두 무시
 */
export default function SyncNotificationPanel({
  items = [],
  loading = false,
  busyId = null,
  onApply,
  onIgnore,
  onApplyAll,
  onIgnoreAll,
  onClose,
}) {
  const groups = groupByTeam(items)
  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <div className={`${styles.panel} glass-card animate-fade-in`} role="region" aria-label="동기화 알림">
      <div className={styles.header}>
        <span className={styles.title}>
          <Bell size={15} />
          알림
          {pendingCount > 0 && <span className={styles.count}>{pendingCount}</span>}
        </span>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="알림 닫기">
          <X size={15} />
        </button>
      </div>

      <div className={styles.body}>
        {loading && items.length === 0 && <p className={styles.notice}>불러오는 중...</p>}
        {!loading && items.length === 0 && (
          <p className={styles.notice}>새 알림이 없습니다. 모임원이 장소를 추가하거나 삭제하면 여기에 쌓입니다.</p>
        )}

        {groups.map(group => (
          <section key={group.teamId} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupName}>
                {group.teamName}
                {group.pendingCount > 0 && <span className={styles.groupCount}>{group.pendingCount}</span>}
              </span>
              {group.pendingCount > 0 && (
                <span className={styles.groupActions}>
                  <button className={styles.textBtn} onClick={() => onApplyAll?.(group.teamId)}>모두 반영</button>
                  <button className={styles.textBtn} onClick={() => onIgnoreAll?.(group.teamId)}>모두 무시</button>
                </span>
              )}
            </div>

            {group.items.map(item => {
              const pending = item.status === 'pending'
              const added = item.type === 'added'
              return (
                <div key={item.id} className={`${styles.row} ${pending ? '' : styles.rowHandled}`}>
                  <span className={`${styles.icon} ${added ? styles.iconAdded : styles.iconDeleted}`}>
                    {added ? <Plus size={13} /> : <Trash2 size={13} />}
                  </span>
                  <div className={styles.info}>
                    <div className={styles.name}>{item.name}</div>
                    <div className={styles.meta}>
                      {item.actorNickname}님이 {added ? '추가' : '삭제'} · {formatTime(item.createdAt)}
                    </div>
                  </div>
                  {pending ? (
                    <div className={styles.actions}>
                      <button
                        className={added ? styles.primaryBtn : styles.dangerBtn}
                        disabled={busyId === item.id}
                        onClick={() => onApply?.(item)}
                      >
                        {added ? '담기' : '삭제'}
                      </button>
                      <button
                        className={styles.ghostBtn}
                        disabled={busyId === item.id}
                        onClick={() => onIgnore?.(item)}
                      >
                        무시
                      </button>
                    </div>
                  ) : (
                    <span className={styles.handledTag}>
                      {item.status === 'applied' ? <><Check size={11} />반영됨</> : '무시함'}
                    </span>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
