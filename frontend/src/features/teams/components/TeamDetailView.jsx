import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Check, MapPin } from 'lucide-react'
import { fetchTeam } from '../api'
import { buildInviteLink, inviteBase } from '../inviteLink'
import styles from './TeamDetailView.module.css'

// 한 페이지 인원. 작은 휴대폰에서도 바텀시트(최대 85vh) 안에 하단 버튼까지 스크롤 없이 들어오는 정도
const PAGE_SIZE = 6
// 열려 있는 동안 온라인 상태를 다시 불러오는 주기 (heartbeat 주기와 같게)
const REFRESH_MS = 30_000

/**
 * 모임 상세 (모임 목록 서랍 안에서 전환되는 화면)
 * - 상단: 초대 링크 (기본 마스킹, 눈 버튼으로 보기, 클릭하면 복사)
 * - 온라인 인원 / 전체 인원
 * - 멤버 목록 (온라인 먼저, 페이지네이션)
 */
export default function TeamDetailView({ teamId, onBack, onEnter }) {
  const [team, setTeam] = useState(null)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'failed'
  const [page, setPage] = useState(0)

  useEffect(() => {
    const load = () => fetchTeam(teamId)
      .then(data => { setTeam(data); setError('') })
      .catch(e => setError(`모임 정보를 불러오지 못했습니다: ${e.message}`))
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [teamId])

  if (!team) {
    return (
      <div className={styles.wrap}>
        <Header title="모임 정보" onBack={onBack} />
        {error ? <div className={styles.errorText} role="alert">{error}</div> : <div className={styles.loading}>불러오는 중...</div>}
      </div>
    )
  }

  // 온라인 먼저, 같은 상태끼리는 모임장 먼저 (나머지는 서버 순서 = 가입 순)
  const isOwner = m => m.role === 'owner'
  const members = [...(team.members || [])].sort((a, b) =>
    Number(b.online) - Number(a.online) || Number(isOwner(b)) - Number(isOwner(a)))
  const onlineCount = members.filter(m => m.online).length
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE))
  // 새로고침으로 인원이 줄어 현재 페이지가 사라져도 마지막 페이지를 보여준다
  const currentPage = Math.min(page, totalPages - 1)
  const pageMembers = members.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const inviteLink = buildInviteLink(team.inviteCode)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopyState('copied')
    } catch {
      // http://192.168.x.x 처럼 HTTPS가 아닌 주소에서는 Clipboard API가 없어서 예전 방식으로 복사한다
      setCopyState(copyWithTextarea(inviteLink) ? 'copied' : 'failed')
    }
    setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <div className={styles.wrap}>
      <Header title={team.name} onBack={onBack} />

      {/* 초대 링크 */}
      <section className={styles.inviteSection}>
        <div className={styles.sectionLabel}>초대 링크</div>
        {inviteLink ? (
          <div className={styles.inviteRow}>
            <button
              type="button"
              className={styles.inviteBox}
              onClick={handleCopy}
              title="클릭하면 복사됩니다"
              aria-label="초대 링크 복사"
            >
              <span className={styles.inviteText}>
                {revealed ? inviteLink : `${inviteBase()}${'•'.repeat(10)}`}
              </span>
              <span className={copyState === 'copied' ? styles.copiedTag : styles.copyIcon}>
                {copyState === 'copied' ? <><Check size={13} />복사됨</> : <Copy size={14} />}
              </span>
            </button>
            <button
              type="button"
              className={styles.revealBtn}
              onClick={() => setRevealed(v => !v)}
              aria-label={revealed ? '초대 링크 숨기기' : '초대 링크 보기'}
              aria-pressed={revealed}
              title={revealed ? '숨기기' : '보기'}
            >
              {revealed ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        ) : (
          <div className={styles.emptyInvite}>이 모임에는 유효한 초대 링크가 없습니다.</div>
        )}
        {copyState === 'failed' && <div className={styles.errorText} role="alert">복사하지 못했습니다. 링크를 보이게 한 뒤 직접 복사해 주세요.</div>}
      </section>

      {/* 인원 요약 */}
      <div className={styles.summary}>
        <span className={styles.summaryOnline}>
          <span className={styles.onlineDot} aria-hidden="true" />
          <span>온라인 <strong>{onlineCount}</strong>명</span>
        </span>
        <span className={styles.summaryDivider} aria-hidden="true">·</span>
        <span>전체 <strong>{members.length}</strong>명</span>
      </div>

      {/* 멤버 목록 */}
      <ul className={styles.memberList}>
        {pageMembers.map(m => (
          <li key={m.id} className={styles.memberRow}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar} style={{ background: m.avatarColor || m.color }}>{m.initials}</div>
              <span className={`${styles.statusDot} ${m.online ? styles.statusOnline : ''}`} aria-hidden="true" />
            </div>
            <span className={styles.memberName}>{m.nickname}</span>
            {m.role === 'owner' && <span className={styles.ownerTag}>모임장</span>}
            <span className={m.online ? styles.statusTextOnline : styles.statusText}>
              {m.online ? '온라인' : '오프라인'}
            </span>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="멤버 페이지">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={16} />
          </button>
          <span className={styles.pageInfo}>{currentPage + 1} / {totalPages}</span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            aria-label="다음 페이지"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}

      {error && <div className={styles.errorText} role="alert">{error}</div>}

      <button type="button" className="btn btn-primary" onClick={() => onEnter(team.id)}>
        <MapPin size={16} />
        이 모임 지도 보기
      </button>
    </div>
  )
}

function copyWithTextarea(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

function Header({ title, onBack }) {
  return (
    <div className={styles.header}>
      <button type="button" className="btn btn-ghost btn-icon" onClick={onBack} aria-label="모임 목록으로">
        <ArrowLeft size={18} />
      </button>
      <h3 className={styles.title}>{title}</h3>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
