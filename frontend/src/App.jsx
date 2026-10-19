import { useState, useEffect } from 'react'
import AuthPage from './pages/AuthPage'
import TeamsPage from './pages/TeamsPage'
import MapPage from './pages/MapPage'
import { CURRENT_USER } from './data/mockData'
import './App.css'

/**
 * PinMate 메인 애플리케이션 컴포넌트
 * - 로그인 상태 관리 (AuthPage)
 * - 팀 선택 화면 (TeamsPage)
 * - 팀별 지도 화면 (MapPage)
 */
function App() {
  // 로그인 상태 유지 (localStorage 연동)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('pinmate_logged_in') === 'true'
  })

  // 현재 활성화된 팀 ID
  const [activeTeamId, setActiveTeamId] = useState(() => {
    return localStorage.getItem('pinmate_active_team') || null
  })

  // 로그인 핸들러
  const handleLogin = () => {
    setIsLoggedIn(true)
    localStorage.setItem('pinmate_logged_in', 'true')
  }

  // 로그아웃 핸들러
  const handleLogout = () => {
    setIsLoggedIn(false)
    setActiveTeamId(null)
    localStorage.removeItem('pinmate_logged_in')
    localStorage.removeItem('pinmate_active_team')
  }

  // 팀 선택 핸들러
  const handleSelectTeam = (teamId) => {
    setActiveTeamId(teamId)
    if (teamId) {
      localStorage.setItem('pinmate_active_team', teamId)
    } else {
      localStorage.removeItem('pinmate_active_team')
    }
  }

  // 1. 미로그인 상태: 로그인/회원가입 화면
  if (!isLoggedIn) {
    return <AuthPage onLogin={handleLogin} />
  }

  // 2. 팀 미선택 상태: 팀 목록 화면
  if (!activeTeamId) {
    return (
      <TeamsPage
        onSelectTeam={handleSelectTeam}
        onLogout={handleLogout}
      />
    )
  }

  // 3. 팀 지도 화면
  return (
    <MapPage
      teamId={activeTeamId}
      onBack={() => handleSelectTeam(null)}
    />
  )
}

export default App
