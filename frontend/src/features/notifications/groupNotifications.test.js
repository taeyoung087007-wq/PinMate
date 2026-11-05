import { describe, it, expect } from 'vitest'
import { groupNotifications } from './groupNotifications'

const note = (id, over = {}) => ({
  id, teamId: '1', teamName: '충청바이브', type: 'added', status: 'pending',
  actorLoginId: 'junho', createdAt: '2026-11-05T01:00:00.123456Z', name: `장소${id}`, ...over,
})

describe('groupNotifications', () => {
  it('같은 사람이 한 번에 가져온 장소들은 한 묶음, 따로 추가한 장소는 따로', () => {
    const [team] = groupNotifications([
      note(1), note(2), note(3),
      note(4, { createdAt: '2026-11-05T02:00:00Z' }),
    ])

    expect(team.batches.map(b => b.items.length)).toEqual([3, 1])
    expect(team.pendingCount).toBe(2)
  })

  it('종류·사람·모임이 다르면 다른 묶음', () => {
    const groups = groupNotifications([
      note(1), note(2, { type: 'deleted' }), note(3, { actorLoginId: 'minji' }), note(4, { teamId: '2', teamName: 'das' }),
    ])

    expect(groups.map(g => g.teamId)).toEqual(['1', '2'])
    expect(groups[0].batches).toHaveLength(3)
  })

  it('처리 안 한 묶음을 위로, 처리한 알림만 남은 묶음은 개수에서 뺀다', () => {
    const [team] = groupNotifications([
      note(1, { status: 'applied', createdAt: 'a' }),
      note(2, { createdAt: 'b' }), note(3, { createdAt: 'b', status: 'ignored' }),
    ])

    expect(team.batches[0].key).toContain('|b')
    expect(team.batches[0].pending.map(i => i.id)).toEqual([2])
    expect(team.pendingCount).toBe(1)
  })
})
