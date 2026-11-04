import { useState } from 'react'
import { X, MapPin, Check } from 'lucide-react'
import { CATEGORY_META } from '../categories'
import styles from './ImportPersonalPinsModal.module.css'

/**
 * 내 지도 핀을 모임으로 가져오기 (F-68)
 * - 모임을 만들거나 참여한 직후, 또는 모임 상세에서 다시 열 수 있다
 * - 전체 선택된 상태로 보여주고, 빼고 싶은 것만 해제한다
 */
export default function ImportPersonalPinsModal({ places = [], teamName = '', onClose, onImport }) {
  const [selected, setSelected] = useState(() => new Set(places.map(p => String(p.id))))
  const [busy, setBusy] = useState(false)

  const allChecked = places.length > 0 && selected.size === places.length
  const toggle = id => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    if (busy || selected.size === 0) return
    setBusy(true)
    try {
      await onImport([...selected])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className={`${styles.modal} glass-card animate-slide-up`} role="dialog" aria-label="내 장소 가져오기">
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>내 장소 {places.length}곳을 가져올까요?</h3>
            <p className={styles.subtitle}>
              {teamName ? `'${teamName}' 모임에 ` : '모임에 '}담아요. 같은 장소는 내 추천으로 합쳐집니다.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={busy} title="닫기">
            <X size={16} />
          </button>
        </div>

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.selectAll}
            onClick={() => setSelected(allChecked ? new Set() : new Set(places.map(p => String(p.id))))}
          >
            <span className={`${styles.checkbox} ${allChecked ? styles.checkboxOn : ''}`}>
              {allChecked && <Check size={11} />}
            </span>
            전체 선택
          </button>
          <span className={styles.count}>{selected.size}곳 선택</span>
        </div>

        <div className={styles.list}>
          {places.map(place => {
            const meta = CATEGORY_META[place.category] || CATEGORY_META.etc
            const checked = selected.has(String(place.id))
            return (
              <button
                key={place.id}
                type="button"
                className={`${styles.row} ${checked ? styles.rowOn : ''}`}
                onClick={() => toggle(String(place.id))}
                aria-pressed={checked}
              >
                <span className={`${styles.checkbox} ${checked ? styles.checkboxOn : ''}`}>
                  {checked && <Check size={11} />}
                </span>
                <span className={styles.emoji}>{meta.icon}</span>
                <span className={styles.info}>
                  <span className={styles.name}>{place.name}</span>
                  <span className={styles.addr}>
                    <MapPin size={10} />
                    {place.roadAddress || place.address || '주소 없음'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            건너뛰기
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={busy || selected.size === 0}>
            {busy ? '가져오는 중...' : `${selected.size}곳 가져오기`}
          </button>
        </div>
      </div>
    </div>
  )
}
