/**
 * 알림을 모임별로, 그 안에서는 '한 번에 생긴 묶음'별로 나눈다.
 * - 묶음: 같은 사람이 같은 종류로 같은 시각에 만든 알림 (가져오기로 여러 곳을 한 번에 넣은 경우).
 *   서버는 한 트랜잭션의 알림에 같은 created_at 을 넣고, 배지도 같은 기준으로 묶음 수를 센다 (sync.xml countPending)
 * - 처리 안 한 묶음을 위로 올린다
 * @returns {Array<{ teamId, teamName, batches: Array<{ key, items, pending }>, pendingCount }>}
 */
export function groupNotifications(items) {
  const teams = new Map()
  items.forEach(item => {
    if (!teams.has(item.teamId)) teams.set(item.teamId, { teamId: item.teamId, teamName: item.teamName || '모임', batches: new Map() })
    const batches = teams.get(item.teamId).batches
    const key = `${item.actorLoginId}|${item.type}|${item.createdAt}`
    if (!batches.has(key)) batches.set(key, { key, items: [] })
    batches.get(key).items.push(item)
  })

  return [...teams.values()].map(team => {
    const batches = [...team.batches.values()]
      .map(batch => ({ ...batch, pending: batch.items.filter(i => i.status === 'pending') }))
      .sort((a, b) => Number(b.pending.length > 0) - Number(a.pending.length > 0))
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      batches,
      pendingCount: batches.filter(b => b.pending.length > 0).length,
    }
  })
}
