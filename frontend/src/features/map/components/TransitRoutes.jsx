import { formatMinutes } from '../transit'
import styles from './TransitRoutes.module.css'

/**
 * 대중교통 경로 후보 목록 (길찾기 패널 안)
 * - 카드: 총 시간 · 환승 · 요금 · 도보, 타는 버스/지하철 칩
 * - 고른 카드는 펼쳐서 구간별 안내를 보여준다
 */
export default function TransitRoutes({ options, selectedIndex, onSelect }) {
  return (
    <ul className={styles.list}>
      {options.map((option, index) => {
        const selected = index === selectedIndex
        const rides = option.legs.filter(leg => leg.kind !== 'walk')
        return (
          <li key={`${option.mapObj}-${index}`}>
            <button
              type="button"
              className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
              onClick={() => onSelect(index)}
              aria-pressed={selected}
            >
              <div className={styles.summary}>
                <strong className={styles.time}>{formatMinutes(option.totalMinutes)}</strong>
                <span className={styles.meta}>
                  {option.transfers > 0 ? `환승 ${option.transfers}회` : '환승 없음'} · {option.payment.toLocaleString()}원 · 도보 {option.walkMinutes}분
                </span>
              </div>
              <div className={styles.chips}>
                {rides.map((leg, i) => (
                  <span key={i} className={styles.chip} style={{ background: leg.color }}>
                    {leg.kind === 'bus' ? '🚌' : '🚇'} {shortName(leg.names[0])}
                    {leg.names.length > 1 && <span className={styles.more}> 외 {leg.names.length - 1}</span>}
                  </span>
                ))}
              </div>
            </button>

            {selected && (
              <ol className={styles.steps}>
                {option.legs.filter(leg => leg.kind !== 'walk' || leg.distance > 0).map((leg, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepDot} style={{ background: leg.kind === 'walk' ? 'var(--text-muted)' : leg.color }} aria-hidden="true" />
                    {leg.kind === 'walk' ? (
                      <span className={styles.stepText}>도보 {leg.minutes}분 <span className={styles.stepSub}>{leg.distance}m</span></span>
                    ) : (
                      <span className={styles.stepText}>
                        <strong>{leg.names.join(', ')}</strong>
                        {leg.kind === 'bus' ? '번 버스' : ''} · {leg.startName} 승차 → {leg.endName} 하차
                        <span className={styles.stepSub}> {leg.stationCount}정거장 · {leg.minutes}분</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// 칩에는 방면 표시를 뺀다: "1003(반석역방면)" → "1003" (구간 안내에는 그대로 둔다)
const shortName = name => name.replace(/\s*\(.*\)\s*$/, '')
