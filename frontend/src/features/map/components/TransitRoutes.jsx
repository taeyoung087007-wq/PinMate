import { formatMinutes } from '../transit'
import { nextArrival, formatArrival, shortName } from '../useTransitRealtime'
import styles from './TransitRoutes.module.css'

/**
 * 대중교통 경로 후보 목록 (길찾기 패널 안)
 * - 카드: 총 시간 · 환승 · 요금 · 도보, 타는 버스/지하철 칩
 * - 고른 카드는 펼쳐서 구간별 안내를 보여준다
 */
export default function TransitRoutes({ options, selectedIndex, onSelect, arrivals = {} }) {
  return (
    <ul className={styles.list}>
      {options.map((option, index) => {
        const selected = index === selectedIndex
        const rides = option.legs.filter(leg => leg.kind !== 'walk')
        const firstBus = rides.find(leg => leg.kind === 'bus')
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
              {firstBus && <LiveArrival arrival={nextArrival(arrivals, firstBus)} />}
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
                        {leg.kind === 'bus' && <LiveArrival arrival={nextArrival(arrivals, leg)} />}
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

/** 실시간 도착 한 줄 ("509번 3분 후 · 2정거장 전"). 정보가 없으면 그리지 않는다 */
function LiveArrival({ arrival }) {
  if (!arrival) return null
  return (
    <span className={styles.live}>
      <span className={styles.liveDot} aria-hidden="true" />
      {arrival.routeNo}번 {formatArrival(arrival)}
    </span>
  )
}
