import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, ChevronRight, KeyRound, LogOut, MapPin, Settings2, UserRound } from 'lucide-react'
import styles from './SettingsPage.module.css'
import { getAvatar, getAvatarColor } from '../avatars'
import { ProfileEditor, PasswordEditor, RecommendedPlaces, DeleteAccount } from '../components/SettingsViews'

const accountItems = [
  { id: 'profile', label: '프로필 수정', description: '나를 나타내는 닉네임과 프로필', icon: UserRound },
  { id: 'password', label: '비밀번호 변경', description: '내 계정을 안전하게 관리하기', icon: KeyRound },
]

const views = {
  home: ['설정', '내 계정부터 추천한 장소까지, 한곳에서.'],
  profile: ['프로필 수정', '모임에서 나를 알아볼 수 있도록.'],
  password: ['비밀번호 변경', '내 계정을 위한 새로운 비밀번호.'],
  places: ['내가 추천한 장소', '우리 지도에 남긴 나의 취향을 모았어요.'],
  delete: ['회원 탈퇴', '떠나기 전에 꼭 확인해 주세요.'],
}

export default function SettingsPage({ currentUser, onLogout, onUserUpdate, onWithdrawn, places = [], teamName, categories = {}, placesStatus = 'ready', onViewPlace, onExplore }) {
  const [view, setView] = useState('home')
  const [message, setMessage] = useState('')
  const pageRef = useRef(null)
  const titleRef = useRef(null)
  useEffect(() => {
    pageRef.current?.scrollTo(0, 0)
    titleRef.current?.focus({ preventScroll: true })
  }, [view])
  const open = (next) => { setMessage(''); setView(next) }
  const home = () => setView('home')
  const user = currentUser
  const avatar = getAvatar(user.avatarId)

  return (
    <main ref={pageRef} className={styles.page} aria-labelledby="settings-title">
      <div className={`${styles.content} ${view !== 'home' ? styles.detailContent : ''}`}>
        {view !== 'home' && <button className={styles.back} type="button" onClick={home}><ArrowLeft size={17} />설정으로</button>}
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}><Settings2 size={22} aria-hidden="true" /></span>
            <h1 id="settings-title" ref={titleRef} tabIndex={-1}>{views[view][0]}</h1>
          </div>
          <p>{views[view][1]}</p>
        </header>

        {message && <p role="status" className={styles.feedback}>{message}</p>}
        {view === 'profile' && <ProfileEditor user={user} onCancel={home} onSaved={saved => { onUserUpdate({ ...user, ...saved }); setMessage('프로필을 저장했어요.'); home() }} />}
        {view === 'password' && <PasswordEditor onCancel={home} />}
        {view === 'places' && <RecommendedPlaces places={places} teamName={teamName} categories={categories} status={placesStatus} onViewPlace={onViewPlace} onExplore={onExplore} />}
        {view === 'delete' && <DeleteAccount onCancel={home} onWithdrawn={onWithdrawn} />}
        {view === 'home' && <div className={styles.layout}>
          <aside className={styles.identity} aria-label="내 프로필">
            <div className={styles.profile}>
              <div className={styles.profileTop}>
                <span>내 프로필</span>
                <img src="/logo-symbol.png" alt="" className={styles.brandSymbol} />
              </div>
              <img className={styles.avatar} style={{ backgroundColor: getAvatarColor(user.avatarBg) }} src={avatar.src} alt={`${avatar.name} 프로필 아바타`} width="72" height="72" />
              <h2 className={styles.nickname}>{user.nickname}</h2>
              {user.email && <p className={styles.email}>{user.email}</p>}
              <div className={styles.profileFooter}>
                <MapPin size={15} aria-hidden="true" />
                <span>함께 발견하고, 함께 기억하는 장소</span>
              </div>
            </div>
            <button className={styles.logout} type="button" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" />
              로그아웃
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </aside>

          <div className={styles.settings}>
            <section className={styles.section} aria-labelledby="account-settings-title">
              <div className={styles.sectionHeading}>
                <h2 id="account-settings-title">계정 관리</h2>
                <p>나의 정보를 관리해요.</p>
              </div>
              <div className={styles.list}>
                {accountItems.map(({ id, label, description, icon: Icon }) => (
                  <button className={styles.row} key={id} type="button" onClick={() => open(id)}>
                    <span className={styles.icon}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{label}</span>
                      <span className={styles.description}>{description}</span>
                    </span>
                    <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="activity-title">
              <div className={styles.sectionHeading}>
                <h2 id="activity-title">내 활동</h2>
                <p>우리 지도에 남긴 나의 취향.</p>
              </div>
              <button className={styles.activity} type="button" onClick={() => open('places')}>
                <span className={styles.activityIcon}><MapPin size={23} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>내가 추천한 장소</span>
                  <span className={styles.description}>다시 가고 싶은 곳들을 모아봐요.</span>
                </span>
                <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
              </button>
            </section>

            <footer className={styles.accountFooter}>
              <span>PinMate를 떠나시나요?</span>
              <button type="button" onClick={() => open('delete')}>회원 탈퇴</button>
            </footer>
          </div>
        </div>}
      </div>
    </main>
  )
}
