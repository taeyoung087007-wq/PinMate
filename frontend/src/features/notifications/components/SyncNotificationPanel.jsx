import { X, Bell, Plus, Trash2, Check } from 'lucide-react'
import { groupNotifications } from '../groupNotifications'
import styles from './SyncNotificationPanel.module.css'

const formatTime = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * 동기화 알림 (F-71, F-72)
 * - 다른 팀원이 장소를 추가·삭제한 내역을 모임별로 보여준다
 * - 항목별 '내 지도에 담기'(추가) / '내 지도에서 삭제'(삭제) / '무시', 모임 단위 모두 반영·모두 무시
 * - 한 번에 생긴 알림(가져오기로 여러 곳)은 한 줄로 묶고 '모두 담기'·'무시'로 한꺼번에 처리한다. 이름 목록은 펼쳐 본다
 */
export default function SyncNotificationPanel({
  items = [],
  loading = false,
  busyId = null,
  onApply,
  onIgnore,
  onApplyAll,
  onIgnoreAll,
  onApplyMany,
  onIgnoreMany,
  onClose,
}) {
  const groups = groupNotifications(items)
  const pendingCount = groups.reduce((sum, g) => sum + g.pendingCount, 0) // 배지와 같은 기준 (묶음은 1건)

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

            {group.batches.map(batch => (batch.items.length === 1
              ? <SingleRow key={batch.key} item={batch.items[0]} busyId={busyId} onApply={onApply} onIgnore={onIgnore} />
              : <BatchRow key={batch.key} batch={batch} busyId={busyId} onApply={onApplyMany} onIgnore={onIgnoreMany} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function SingleRow({ item, busyId, onApply, onIgnore }) {
  const pending = item.status === 'pending'
  const added = item.type === 'added'
  return (
    <div className={`${styles.row} ${pending ? '' : styles.rowHandled}`}>
      <TypeIcon added={added} />
      <div className={styles.info}>
        <div className={styles.name}>{item.name}</div>
        <div className={styles.meta}>
          {item.actorNickname}님이 {added ? '추가' : '삭제'} · {formatTime(item.createdAt)}
        </div>
      </div>
      {pending ? (
        <Actions added={added} busy={busyId === item.id} onApply={() => onApply?.(item)} onIgnore={() => onIgnore?.(item)} />
      ) : (
        <HandledTag status={item.status} />
      )}
    </div>
  )
}

// 한 번에 생긴 여러 곳. 처리 안 한 것만 한꺼번에 담기·무시한다
function BatchRow({ batch, busyId, onApply, onIgnore }) {
  const [first] = batch.items
  const added = first.type === 'added'
  const pending = batch.pending.length > 0
  return (
    <div className={`${styles.row} ${styles.batchRow} ${pending ? '' : styles.rowHandled}`}>
      <TypeIcon added={added} />
      <div className={styles.info}>
        <div className={styles.name}>{first.name} 외 {batch.items.length - 1}곳</div>
        <div className={styles.meta}>
          {first.actorNickname}님이 {batch.items.length}곳 {added ? '추가' : '삭제'} · {formatTime(first.createdAt)}
        </div>
        <details className={styles.batchDetails}>
          <summary>장소 보기</summary>
          <ul className={styles.batchList}>
            {batch.items.map(item => <li key={item.id}>{item.name}</li>)}
          </ul>
        </details>
      </div>
      {pending ? (
        <Actions
          added={added}
          many
          busy={busyId === `batch-${first.id}`}
          onApply={() => onApply?.(batch.pending, `batch-${first.id}`)}
          onIgnore={() => onIgnore?.(batch.pending, `batch-${first.id}`)}
        />
      ) : (
        <HandledTag status={first.status} />
      )}
    </div>
  )
}

function TypeIcon({ added }) {
  return (
    <span className={`${styles.icon} ${added ? styles.iconAdded : styles.iconDeleted}`}>
      {added ? <Plus size={13} /> : <Trash2 size={13} />}
    </span>
  )
}

function Actions({ added, many = false, busy, onApply, onIgnore }) {
  return (
    <div className={styles.actions}>
      <button className={added ? styles.primaryBtn : styles.dangerBtn} disabled={busy} onClick={onApply}>
        {many ? '모두 ' : ''}{added ? '담기' : '삭제'}
      </button>
      <button className={styles.ghostBtn} disabled={busy} onClick={onIgnore}>
        무시
      </button>
    </div>
  )
}

function HandledTag({ status }) {
  return (
    <span className={styles.handledTag}>
      {status === 'applied' ? <><Check size={11} />반영됨</> : '무시함'}
    </span>
  )
}
