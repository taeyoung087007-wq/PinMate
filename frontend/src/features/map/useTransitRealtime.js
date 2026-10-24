import { useEffect, useMemo, useState } from 'react'
import { fetchArrivals, fetchBusLocations } from './api'

// 갱신 주기. TAGO 개발계정 일일 한도를 고려해 너무 자주 부르지 않는다
const ARRIVAL_REFRESH_MS = 30_000
const LOCATION_REFRESH_MS = 20_000
// 한 구간에 버스가 여러 노선이면 위치는 앞에서부터 이만큼만 그린다
const MAX_ROUTES_PER_LEG = 3

/** 탭이 보이는 동안만 fn 을 즉시 + 주기적으로 실행한다 (숨기면 멈추고, 다시 보이면 바로 한 번) */
function usePolling(fn, intervalMs, active) {
  useEffect(() => {
    if (!active) return
    let timer = null
    const start = () => {
      if (timer || document.hidden) return
      fn()
      timer = setInterval(fn, intervalMs)
    }
    const stop = () => {
      clearInterval(timer)
      timer = null
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fn, intervalMs, active])
}

/**
 * 대중교통 경로의 실시간 정보 (TAGO, 백엔드 경유)
 * - arrivals: 후보들의 버스 승차 정류장별 도착 예정 { [stationId]: { cityCode, arrivals: [...] } }
 * - buses: 고른 후보의 버스 노선별 운행 위치 [{ routeId, color, name, lat, lng, vehicleNo }]
 * 실패해도 조용히 비워 둔다 (경로 표시는 그대로)
 */
export function useTransitRealtime(transit) {
  const [arrivals, setArrivals] = useState({})
  const [buses, setBuses] = useState([])
  const options = transit?.options
  const index = transit?.index

  // 후보 전체에서 버스 승차 정류장을 모은다 (같은 정류장은 한 번만 조회)
  const stations = useMemo(() => {
    const byId = new Map()
    for (const option of options ?? []) {
      for (const leg of option.legs) {
        if (leg.kind !== 'bus' || !leg.stationId) continue
        const entry = byId.get(leg.stationId) ?? { stationId: leg.stationId, lat: leg.start.lat, lng: leg.start.lng, routeIds: new Set() }
        leg.routeIds.forEach(id => entry.routeIds.add(id))
        byId.set(leg.stationId, entry)
      }
    }
    return [...byId.values()]
  }, [options])

  // 고른 후보의 버스 노선 (위치 표시용)
  const selectedLegs = useMemo(() => {
    const option = options?.[index]
    return (option?.legs ?? []).filter(leg => leg.kind === 'bus' && leg.stationId && leg.routeIds.length)
  }, [options, index])

  useEffect(() => {
    setArrivals({})
  }, [stations])
  useEffect(() => {
    setBuses([])
  }, [selectedLegs])

  const loadArrivals = useMemo(() => async () => {
    const results = await Promise.all(
      stations.map(station =>
        fetchArrivals({ ...station, routeIds: [...station.routeIds] })
          .then(data => [station.stationId, data])
          .catch(() => null)
      )
    )
    setArrivals(Object.fromEntries(results.filter(Boolean)))
  }, [stations])

  usePolling(loadArrivals, ARRIVAL_REFRESH_MS, stations.length > 0)

  // 구간별 도시코드. 문자열로 만들어 두면 도착 정보가 30초마다 갱신돼도 값이 같아 위치 폴링이 다시 시작되지 않는다
  const legCities = selectedLegs.map(leg => arrivals[leg.stationId]?.cityCode ?? '').join(',')

  const loadBuses = useMemo(() => async () => {
    const cities = legCities.split(',')
    const jobs = selectedLegs.flatMap((leg, legIndex) => {
      const cityCode = cities[legIndex]
      if (!cityCode) return []
      return leg.routeIds.slice(0, MAX_ROUTES_PER_LEG).map((routeId, i) =>
        fetchBusLocations(cityCode, routeId)
          .then(list => list.map(bus => ({ ...bus, routeId, color: leg.color, name: shortName(leg.names[i] ?? leg.names[0]) })))
          .catch(() => [])
      )
    })
    setBuses((await Promise.all(jobs)).flat())
  }, [selectedLegs, legCities])

  // 도시코드(도착 정보 응답)를 알아야 위치를 부를 수 있다
  usePolling(loadBuses, LOCATION_REFRESH_MS, legCities.replaceAll(',', '') !== '')

  return { arrivals, buses }
}

/** 구간(leg)에 맞는 가장 빠른 도착 예정. 없으면 null */
export function nextArrival(arrivals, leg) {
  const list = arrivals[leg.stationId]?.arrivals ?? []
  return list.find(a => leg.routeIds.includes(a.routeId)) ?? null
}

export const formatArrival = arrival => {
  const when = arrival.minutes <= 1 ? '곧 도착' : `${arrival.minutes}분 후`
  return arrival.stopsAway != null ? `${when} · ${arrival.stopsAway}정거장 전` : when
}

// "1003(반석역방면)" → "1003"
export const shortName = name => (name ?? '').replace(/\s*\(.*\)\s*$/, '')
