import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import AuthPage from '../features/auth/pages/AuthPage'
import MapPage from '../features/map/pages/MapPage'

/**
 * 앱 라우팅
 * - /login           로그인
 * - /                메인 지도 화면 (기본 모임 바로 로딩)
 * - /teams/:teamId   특정 모임 지도 화면
 * - /teams           메인 지도 화면으로 리다이렉트 (지도 내 모임 서랍 활용)
 */

const LOGIN_KEY = 'pinmate_logged_in'
const isLoggedIn = () => localStorage.getItem(LOGIN_KEY) === 'true'

function RequireLogin() {
  return isLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />
}

function LoginRoute() {
  const navigate = useNavigate()
  const handleLogin = () => {
    localStorage.setItem(LOGIN_KEY, 'true')
    navigate('/', { replace: true })
  }
  return isLoggedIn() ? <Navigate to="/" replace /> : <AuthPage onLogin={handleLogin} />
}

function MapRoute() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem(LOGIN_KEY)
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

