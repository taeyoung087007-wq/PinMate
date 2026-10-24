import { formatMinutes } from '../transit'
import { nextArrival, formatArrival, nextSubway } from '../useTransitRealtime'
import styles from './TransitRoutes.module.css'

/**
 * 대중교통 경로 후보 목록 (길찾기 패널 안). 네이버 지도처럼
 * - 카드: 총 시간 · 도착 예정 시각, 환승 · 요금 · 도보, 구간별 시간 비율 막대
 * - 고른 카드는 세로 타임라인으로 펼친다 (승차·하차 정류장, 방면, 출구, 환승, 실시간 도착)
 * - 도착 정보: 버스는 TAGO 실시간, 지하철은 수도권 실시간(없으면 시간표)
 */
export default function TransitRoutes({ options, selectedIndex, onSelect, arrivals = {}, subway, destName = '도착' }) {
  return (
    <ul className={styles.list}>
      {options.map((option, index) => {
        const selected = index === selectedIndex
        const firstRide = option.legs.find(leg => leg.kind !== 'walk')
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
                <span className={styles.arriveAt}>{arrivalClock(option.totalMinutes)} 도착</span>
              </div>
              <span className={styles.meta}>
                {option.transfers > 0 ? `환승 ${option.transfers}회` : '환승 없음'} · {option.payment.toLocaleString()}원 · 도보 {option.walkMinutes}분
              </span>
              <SegmentBar legs={option.legs} total={option.totalMinutes} />
              {firstRide && <Arrival info={legArrival(firstRide, arrivals, subway)} />}
            </button>

            {selected && <Timeline legs={option.legs} arrivals={arrivals} subway={subway} destName={destName} />}
          </li>
        )
      })}
    </ul>
  )
}

/** 구간별 소요 시간 비율 막대. 짧은 구간도 보이도록 최소 폭을 둔다 */
function SegmentBar({ legs, total }) {
  const visible = legs.filter(leg => leg.minutes > 0 || leg.kind !== 'walk')
  return (
    <div className={styles.bar} aria-hidden="true">
      {visible.map((leg, i) => (
        <span
          key={i}
          className={leg.kind === 'walk' ? styles.barWalk : styles.barRide}
          style={{ flexGrow: Math.max(leg.minutes, 1), flexBasis: 0, background: leg.kind === 'walk' ? undefined : leg.color }}
          title={leg.kind === 'walk' ? `도보 ${leg.minutes}분` : `${leg.names[0]} ${leg.minutes}분`}
        >
          {leg.kind !== 'walk' && (
            <>
              <span className={styles.barBadge} style={{ color: leg.color }}>
                {leg.kind === 'subway' ? leg.badge : '🚌'}
              </span>
              {/* 지하철은 호선 배지만, 버스는 번호를 붙인다 (막대가 좁으면 번호는 잘린다) */}
              {leg.kind === 'bus' && <span className={styles.barText}>{leg.badge}</span>}
            </>
          )}
        </span>
      ))}
      <span className={styles.barLabel}>{total}분</span>
    </div>
  )
}

/** 세로 타임라인: 출발 → (도보 → 승차 → n개 정류장 → 하차)… → 도착 */
function Timeline({ legs, arrivals, subway, destName }) {
  const firstRide = legs.findIndex(leg => leg.kind !== 'walk')
  const lastRide = legs.findLastIndex(leg => leg.kind !== 'walk')
  return (
    <ol className={styles.timeline}>
      <li className={styles.node}>
        <span className={styles.nodeDot} aria-hidden="true" />
        <span className={styles.nodeTitle}>출발 · 내 위치</span>
      </li>

      {legs.map((leg, i) => {
        if (leg.kind === 'walk') {
          // 탈것과 탈것 사이의 도보는 환승. 거리가 0이면 같은 정류장에서 갈아탄다
          const isTransfer = i > firstRide && i < lastRide
          if (leg.distance <= 0 && !isTransfer) return null
          return (
            <li key={i} className={styles.walk}>
              <span className={styles.walkLine} aria-hidden="true" />
              <span className={styles.walkText}>
                {isTransfer && <strong className={styles.transfer}>환승</strong>}
                {leg.distance > 0 ? `도보 ${leg.minutes}분 · ${leg.distance}m` : '같은 정류장'}
              </span>
            </li>
          )
        }

        return (
          <li key={i} className={styles.ride} style={{ '--line': leg.color }}>
            <div className={styles.rideStop}>
              <span className={styles.rideBadge} style={{ background: leg.color }}>
                {leg.kind === 'subway' ? leg.badge : '버스'}
              </span>
              <span className={styles.rideTitle}>
                <strong>{leg.startName}</strong>
                {leg.startExit && <span className={styles.sub}> {leg.startExit}번 출구</span>}
                {leg.stopNo && <span className={styles.sub}> ({leg.stopNo})</span>}
                <span className={styles.sub}> 승차</span>
              </span>
            </div>

            <div className={styles.rideBody}>
              <span className={styles.rideLine}>
                {leg.kind === 'subway'
                  ? <>{leg.names[0]}{leg.way && <> · {leg.way} 방면</>}</>
                  : <>{leg.names.join(', ')}번</>}
              </span>
              <span className={styles.sub}>
                {leg.stationCount}{leg.kind === 'subway' ? '개 역' : '개 정류장'} · {leg.minutes}분
                {leg.interval ? ` · 배차 ${leg.interval}분` : ''}
              </span>
              <Arrival info={legArrival(leg, arrivals, subway)} />
            </div>

            <div className={styles.rideStop}>
              <span className={styles.rideEndDot} style={{ borderColor: leg.color }} aria-hidden="true" />
              <span className={styles.rideTitle}>
                <strong>{leg.endName}</strong>
                {leg.endExit && <span className={styles.sub}> {leg.endExit}번 출구</span>}
                <span className={styles.sub}> 하차</span>
              </span>
            </div>
          </li>
        )
      })}

      <li className={styles.node}>
        <span className={`${styles.nodeDot} ${styles.nodeDotEnd}`} aria-hidden="true" />
        <span className={styles.nodeTitle}>도착 · {destName}</span>
      </li>
    </ol>
  )
}

/** 구간의 다음 도착 { live, text }. 버스는 TAGO 실시간, 지하철은 실시간 또는 시간표 */
function legArrival(leg, arrivals, subway) {
  if (leg.kind === 'bus') {
    const arrival = nextArrival(arrivals, leg)
    return arrival && { live: true, text: `${arrival.routeNo}번 ${formatArrival(arrival)}` }
  }
  return subway ? nextSubway(subway, leg) : null
}

/** 도착 한 줄. 실시간은 깜빡이는 초록 점, 시간표는 회색 시계로 구분한다 */
function Arrival({ info }) {
  if (!info) return null
  return (
    <span className={info.live ? styles.live : styles.scheduled}>
      {info.live
        ? <span className={styles.liveDot} aria-hidden="true" />
        : <span className={styles.clock} aria-hidden="true">🕒</span>}
      {info.text}
      {!info.live && <span className={styles.scheduledTag}>시간표</span>}
    </span>
  )
}

// 지금 출발하면 도착하는 시각 ("오후 3:42")
const arrivalClock = minutes =>
  new Date(Date.now() + minutes * 60_000).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
