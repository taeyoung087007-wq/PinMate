import { useState, useEffect } from 'react'
import {
  MapPin, Plus, Users, ChevronRight, LogOut,
  Star, Search, QrCode, Bell, Settings, Link2
} from 'lucide-react'
import { CURRENT_USER } from '../../../lib/currentUser'
import { fetchTeams, createTeamApi } from '../api'
import TeamCreateModal from '../components/TeamCreateModal'
import styles from './TeamsPage.module.css'

/**
 * 팀 목록 메인 페이지
 * - 사용자가 속한 팀 카드 목록 표시
 * - 새 팀 만들기 및 초대 링크 발급
 * - 초대 링크 입력을 통한 팀 참여
 */
export default function TeamsPage({ onSelectTeam, onLogout }) {
  const [teams, setTeams] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinLinkInput, setJoinLinkInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState('')

  // 서버에서 내 팀 목록 로드
  useEffect(() => {
    fetchTeams(CURRENT_USER.id)
      .then(setTeams)
      .catch(e => setLoadError(`팀 목록을 불러오지 못했습니다: ${e.message}`))
  }, [])

  // 팀 검색 필터링
  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  // 새 팀 생성 핸들러 (실패 시 에러를 모달로 전달)
  const handleCreateTeam = async (name) => {
    const newTeam = await createTeamApi(name, CURRENT_USER.id)
    setTeams(prev => [newTeam, ...prev])
    return newTeam
  }

  // 모달 닫기 및 생성된 팀으로 바로 이동
  const handleCloseCreate = (createdTeam) => {
    setShowCreate(false)
    if (createdTeam && createdTeam.id) {
      onSelectTeam(createdTeam.id)
    }
  }

  // 초대 링크로 팀 참여 시뮬레이션
  const handleJoinWithLink = (e) => {
    e.preventDefault()
    if (!joinLinkInput.trim()) {
      setJoinError('초대 링크 또는 코드를 입력해주세요.')
      return
    }

    // 예시: 첫 번째 팀 또는 새로운 참여 팀으로 이동
    const targetTeam = teams[0]
    if (targetTeam) {
      setShowJoinModal(false)
      onSelectTeam(targetTeam.id)
    } else {
      setJoinError('유효하지 않은 초대 링크입니다.')
    }
  }

  return (
    <div className={styles.container}>
      {/* 좌측 사이드바 */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.sidebarLogoIcon}>
            <MapPin size={20} color="white" strokeWidth={2.5} />
          </div>
          <span className={styles.sidebarLogoText}>PinMate</span>
        </div>

        <nav className={styles.sidebarNav}>
          <button className={`${styles.navItem} ${styles.navItemActive}`}>
            <Users size={18} />
            <span>내 팀 목록</span>
          </button>
          <button className={styles.navItem}>
            <Star size={18} />
            <span>모두 인정 장소</span>
          </button>
          <button className={styles.navItem}>
            <Bell size={18} />
            <span>새 알림</span>
          </button>
          <button className={styles.navItem}>
            <Settings size={18} />
            <span>설정</span>
          </button>
        </nav>

        {/* 내 프로필 / 로그아웃 */}
        <div className={styles.sidebarProfile} onClick={onLogout} title="로그아웃">
          <div className={styles.avatar} style={{ background: CURRENT_USER.avatarColor }}>
            {CURRENT_USER.initials}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{CURRENT_USER.nickname}</span>
            <span className={styles.profileEmail}>{CURRENT_USER.email}</span>
          </div>
          <LogOut size={16} color="var(--text-muted)" />
        </div>
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <main className={styles.main}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>내 팀 목록</h2>
            <p className={styles.headerSub}>친구들과 함께 추천 장소를 지도에 모아보세요</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            새 팀 만들기
          </button>
        </div>

        {/* 검색창 */}
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="팀 이름으로 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* 초대 링크 참여 배너 */}
        <div className={styles.inviteBanner}>
          <div className={styles.inviteBannerLeft}>
            <QrCode size={24} color="var(--primary-light)" />
            <div>
              <div className={styles.inviteBannerTitle}>초대 링크로 팀 참여하기</div>
              <div className={styles.inviteBannerSub}>친구에게 받은 초대 링크나 QR 코드로 팀에 바로 합류할 수 있어요</div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '8px 16px' }}
            onClick={() => { setShowJoinModal(true); setJoinError('') }}
          >
            링크 입력하기
          </button>
        </div>

        {loadError && <div className={styles.errorText} role="alert">{loadError}</div>}

        {/* 팀 카드 그리드 */}
        <div className={styles.teamGrid}>
          {filtered.map((team, i) => (
            <TeamCard
              key={team.id}
              team={team}
              onSelect={() => onSelectTeam(team.id)}
              style={{ animationDelay: `${i * 0.07}s` }}
            />
          ))}

          {/* 새 팀 만들기 카드 */}
          <button className={styles.createCard} onClick={() => setShowCreate(true)}>
            <div className={styles.createCardInner}>
              <div className={styles.createCardIcon}>
                <Plus size={24} color="var(--primary)" />
              </div>
              <span className={styles.createCardText}>새 팀 만들기</span>
            </div>
          </button>
        </div>
      </main>

      {/* 팀 생성 모달 */}
      {showCreate && (
        <TeamCreateModal
          onClose={handleCloseCreate}
          onCreateTeam={handleCreateTeam}
        />
      )}

      {/* 초대 링크 입력 모달 */}
      {showJoinModal && (
        <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div className={`${styles.joinModal} glass-card animate-scale-up`} onClick={e => e.stopPropagation()}>
            <div className={styles.joinHeader}>
              <div className={styles.joinTitle}>
                <Link2 size={18} color="var(--primary-light)" />
                초대 코드로 팀 참여
              </div>
            </div>
            <form onSubmit={handleJoinWithLink} className={styles.joinForm}>
              <p className={styles.joinDesc}>
                친구에게 공유받은 초대 링크 전체 또는 7자리 코드를 입력해주세요.
              </p>
              <input
                className="input"
                placeholder="예: https://pinmate.io/invite/abc1234 또는 abc1234"
                value={joinLinkInput}
                onChange={e => setJoinLinkInput(e.target.value)}
                autoFocus
              />
              {joinError && <div className={styles.errorText}>{joinError}</div>}
              <div className={styles.joinActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  팀 참여하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, onSelect, style }) {
  // 팀 이름에서 이모지 분리
  const hasEmoji = /^\p{Extended_Pictographic}/u.test(team.name)
  const emoji = hasEmoji ? team.name.slice(0, 2) : '📍'
  const title = hasEmoji ? team.name.slice(2).trim() : team.name

  return (
    <div
      className={`${styles.teamCard} glass-card animate-fade-in`}
      onClick={onSelect}
      style={style}
    >
      <div className={styles.teamCardTop}>
        <div className={styles.teamEmoji}>{emoji}</div>
        {team.allApprovedCount > 0 && (
          <span className="badge badge-gold">⭐ 모두 인정 {team.allApprovedCount}곳</span>
        )}
      </div>

      <h3 className={styles.teamName}>{title}</h3>

      {/* 멤버 아바타들 */}
      <div className={styles.teamMembers}>
        {(team.members || []).slice(0, 4).map((m) => (
          <div
            key={m.id}
            className={styles.memberAvatar}
            style={{ background: m.avatarColor }}
            title={m.nickname}
          >
            {m.initials}
          </div>
        ))}
        {(team.memberCount || 0) > 4 && (
          <div className={`${styles.memberAvatar} ${styles.memberAvatarMore}`}>
            +{(team.memberCount || 0) - 4}
          </div>
        )}
      </div>

      <div className={styles.teamMeta}>
        <span className={styles.teamMetaItem}>
          <Users size={12} />
          {team.memberCount || (team.members || []).length}명
        </span>
        <span className={styles.teamMetaItem}>
          <MapPin size={12} />
          핀 {team.pinCount || 0}개
        </span>
      </div>

      <button className={styles.teamCardBtn} tabIndex={-1}>
        지도 바로가기
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
