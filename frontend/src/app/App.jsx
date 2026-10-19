import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import AuthPage from '../features/auth/pages/AuthPage'
import TeamsPage from '../features/teams/pages/TeamsPage'
import MapPage from '../features/map/pages/MapPage'

/**
 * 앱 라우팅
 * - /login           로그인
 * - /teams           팀 목록 (로그인 필요)
 * - /teams/:teamId   팀 지도 (로그인 필요)
 * 페이지는 라우터를 모르도록 props로만 이동을 전달받는다
 */

// ponytail: 로그인 여부를 localStorage 플래그로만 판단. 인증 도입 시 토큰/세션 확인으로 교체
const LOGIN_KEY = 'pinmate_logged_in'
const isLoggedIn = () => localStorage.getItem(LOGIN_KEY) === 'true'

function RequireLogin() {
  return isLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />
}

function LoginRoute() {
  const navigate = useNavigate()
  const handleLogin = () => {
    localStorage.setItem(LOGIN_KEY, 'true')
    navigate('/teams', { replace: true })
  }
  return isLoggedIn() ? <Navigate to="/teams" replace /> : <AuthPage onLogin={handleLogin} />
}

function TeamsRoute() {
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem(LOGIN_KEY)
    navigate('/login', { replace: true })
  }
  return <TeamsPage onSelectTeam={(teamId) => navigate(`/teams/${teamId}`)} onLogout={handleLogout} />
}

function MapRoute() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  // key: 다른 팀으로 이동하면 지도 상태(필터, 선택 핀)를 초기화
  return <MapPage key={teamId} teamId={teamId} onBack={() => navigate('/teams')} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireLogin />}>
        <Route path="/teams" element={<TeamsRoute />} />
        <Route path="/teams/:teamId" element={<MapRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/teams" replace />} />
    </Routes>
  )
}
