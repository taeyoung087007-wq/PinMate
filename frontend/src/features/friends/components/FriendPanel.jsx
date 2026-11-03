import { useCallback, useEffect, useState } from 'react'
import { X, Search, Users, UserPlus, Check } from 'lucide-react'
import { usePanelDrag } from '../../../lib/usePanelDrag'
import {
  fetchFriends,
  searchFriendUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from '../api'
import styles from './FriendPanel.module.css'

const avatarChar = person => (person.nickname || person.loginId || '?').slice(0, 1)
const displayName = person => person.nickname || person.loginId || '사용자'

// 밝은 배경(#ffffff 등)에는 흰 글씨가 안 보이므로 배경 밝기에 따라 글자색을 고른다
function isLightColor(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}

function PersonRow({ person, children }) {
  const light = isLightColor(person.avatarBg)
  return (
    <div className={styles.row}>
      <span
        className={styles.avatar}
        style={{ background: person.avatarBg || 'var(--primary)', color: light ? '#1a1a2e' : '#fff' }}
      >
        {avatarChar(person)}
      </span>
      <div className={styles.info}>
        <span className={styles.nickname}>{displayName(person)}</span>
        {person.loginId && <span className={styles.loginId}>@{person.loginId}</span>}
      </div>
      <div className={styles.actions}>{children}</div>
    </div>
  )
}

/**
 * 친구 패널 (지도 우측 시트)
 * - 받은 요청 수락/거절, 친구 끊기, 아이디·닉네임 검색으로 친구 맺기
 */
export default function FriendPanel({ onClose }) {
  // 우측 사이드 시트: 그랩 핸들을 오른쪽으로 쓸면 닫는다
  const { panelRef, handleRef } = usePanelDrag(onClose, { axis: 'x', sign: 1 })

  const [overview, setOverview] = useState({ friends: [], incoming: [], outgoing: [], pendingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = 아직 검색하지 않음
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setOverview(await fetchFriends())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const runSearch = async value => {
    const q = value.trim()
    if (!q) {
      setResults(null)
      return
    }
    setSearching(true)
    setError('')
    try {
      setResults(await searchFriendUsers(q))
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = event => {
    event.preventDefault()
    runSearch(query)
  }

  // 요청·수락·끊기 뒤에는 목록과 검색 결과를 함께 새로 고친다
  const runAction = async (userId, action) => {
    setBusyId(userId)
    setError('')
    try {
      await action(userId)
      await refresh()
      if (query.trim()) await runSearch(query)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleUnfriend = person => {
    if (!window.confirm(`'${displayName(person)}'님과 친구를 끊을까요?`)) return
    runAction(person.id, removeFriend)
  }

  const relationButton = person => {
    const busy = busyId === person.id
    if (person.status === 'accepted') {
      return <span className={styles.state}>친구</span>
    }
    if (person.status === 'pending' && person.direction === 'outgoing') {
      return <span className={styles.state}>요청됨</span>
    }
    if (person.status === 'pending' && person.direction === 'incoming') {
      return (
        <button className={styles.acceptBtn} disabled={busy} onClick={() => runAction(person.id, acceptFriendRequest)}>
          <Check size={13} />수락
        </button>
      )
    }
    return (
      <button className={styles.addBtn} disabled={busy} onClick={() => runAction(person.id, sendFriendRequest)}>
        <UserPlus size={13} />요청
      </button>
    )
  }

  return (
    <div ref={panelRef} className={`${styles.panel} glass-card animate-fade-in`} role="region" aria-label="친구">
      {/* 드래그 핸들: 오른쪽으로 쓸어 닫는다 */}
      <div className={styles.dragStrip} ref={handleRef} aria-hidden="true">
        <span className={styles.grabber} />
      </div>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Users size={16} color="var(--primary-light)" />
          친구
          {overview.pendingCount > 0 && <span className={styles.count}>{overview.pendingCount}</span>}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="친구 닫기">
          <X size={15} />
        </button>
      </div>

      {/* 받은 요청은 검색창 위에 고정해 항상 먼저 보이게 한다 */}
      {!loading && results === null && overview.incoming.length > 0 && (
        <div className={styles.requests}>
          <div className={styles.requestsLabel}>
            받은 요청
            <span className={styles.requestsCount}>{overview.incoming.length}</span>
          </div>
          {overview.incoming.map(person => (
            <PersonRow key={person.id} person={person}>
              <button className={styles.acceptBtn} disabled={busyId === person.id} onClick={() => runAction(person.id, acceptFriendRequest)}>
                <Check size={13} />수락
              </button>
              <button className={styles.ghostBtn} disabled={busyId === person.id} onClick={() => runAction(person.id, removeFriend)}>
                거절
              </button>
            </PersonRow>
          ))}
        </div>
      )}

      <form className={styles.searchBar} onSubmit={handleSearch}>
        <Search size={13} color="var(--text-muted)" />
        <input
          className={styles.searchInput}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            if (!event.target.value.trim()) setResults(null)
          }}
          placeholder="아이디·닉네임으로 친구 찾기"
          aria-label="친구 검색"
        />
        {query && (
          <button type="button" className={styles.clearBtn} onClick={() => { setQuery(''); setResults(null) }} aria-label="검색어 지우기">
            <X size={12} />
          </button>
        )}
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.body}>
        {loading ? (
          <p className={styles.notice}>불러오는 중…</p>
        ) : results !== null ? (
          <>
            <div className={styles.groupLabel}>검색 결과 ({results.length})</div>
            {searching && <p className={styles.notice}>검색 중…</p>}
            {!searching && results.length === 0 && <p className={styles.notice}>검색 결과가 없습니다.</p>}
            {results.map(person => (
              <PersonRow key={person.id} person={person}>{relationButton(person)}</PersonRow>
            ))}
          </>
        ) : (
          <>
            <div className={styles.groupLabel}>내 친구 ({overview.friends.length})</div>
            {overview.friends.length === 0 ? (
              <p className={styles.notice}>아직 친구가 없습니다. 위에서 아이디로 찾아보세요.</p>
            ) : (
              overview.friends.map(person => (
                <PersonRow key={person.id} person={person}>
                  <button className={styles.ghostBtn} disabled={busyId === person.id} onClick={() => handleUnfriend(person)}>
                    끊기
                  </button>
                </PersonRow>
              ))
            )}

            {overview.outgoing.length > 0 && (
              <>
                <div className={styles.groupLabel}>보낸 요청 ({overview.outgoing.length})</div>
                {overview.outgoing.map(person => (
                  <PersonRow key={person.id} person={person}>
                    <span className={styles.state}>대기 중</span>
                    <button className={styles.ghostBtn} disabled={busyId === person.id} onClick={() => runAction(person.id, removeFriend)}>
                      취소
                    </button>
                  </PersonRow>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
