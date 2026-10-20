import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AuthPage from '../features/auth/pages/AuthPage'
import MapPage from '../features/map/pages/MapPage'
import InvitePage from '../features/teams/pages/InvitePage'
import { post } from '../lib/apiClient'
import { getCurrentUser, setCurrentUserStorage } from '../lib/currentUser'

/**
 * 앱 라우팅
 * - /login           로그인 (?invite=코드: 로그인 전이면 가입 화면, 로그인 후면 참여 확인 화면)
 * - /                메인 지도 화면 (기본 모임 바로 로딩)
 * - /teams/:teamId   특정 모임 지도 화면
 * - /teams           메인 지도 화면으로 리다이렉트 (지도 내 모임 서랍 활용)
 */

const LOGIN_KEY = 'pinmate_logged_in'
const isLoggedIn = () => localStorage.getItem(LOGIN_KEY) === 'true'

// 서버는 90초 안에 신호를 보낸 사용자를 온라인으로 본다
const HEARTBEAT_MS = 30_000

function RequireLogin() {
  const loggedIn = isLoggedIn()

  // 로그인한 동안 접속 상태를 주기적으로 알린다 (모임 상세의 온라인 표시용)
  useEffect(() => {
    if (!loggedIn) return
    const beat = () => post('/presence/heartbeat', { userId: getCurrentUser().id }).catch(() => {})
    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [loggedIn])

  return loggedIn ? <Outlet /> : <Navigate to="/login" replace />
}

function LoginRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invite = searchParams.get('invite')

  const handleLogin = (user) => {
    localStorage.setItem(LOGIN_KEY, 'true')
    if (user) {
      setCurrentUserStorage(user)
    }
    // 초대 링크로 들어왔으면 로그인 뒤 같은 링크의 참여 확인 화면으로 돌아간다
    navigate(invite ? `/login?invite=${encodeURIComponent(invite)}` : '/', { replace: true })
  }

  if (isLoggedIn()) {
    // key: 다른 초대 링크로 바뀌면 이전 모임 정보가 남지 않도록 새로 그린다
    return invite ? <InvitePage key={invite} code={invite} /> : <Navigate to="/" replace />
  }
  return <AuthPage onLogin={handleLogin} />
}

function MapRoute() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem(LOGIN_KEY)
    setCurrentUserStorage(null)
    navigate('/login', { replace: true })
  }
  return <MapPage key={teamId || 'default'} initialTeamId={teamId} onLogout={handleLogout} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireLogin />}>
        <Route path="/" element={<MapRoute />} />
        <Route path="/teams/:teamId" element={<MapRoute />} />
        <Route path="/teams" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

