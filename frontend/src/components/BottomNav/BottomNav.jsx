import { Map, Users, Star, Settings } from 'lucide-react'
import styles from './BottomNav.module.css'

/**
 * 모바일/웹 공용 하단 내비게이션 바
 * - 지도(메인)
 * - 모임 목록 / 전환
 * - 모두 인정 장소 모아보기
 * - 설정
 */
export default function BottomNav({ activeTab, onTabChange, approvedCount = 0, teamCount = 0 }) {
  const tabs = [
    { id: 'map', label: '지도', icon: Map },
    { id: 'teams', label: '모임', icon: Users, badge: teamCount > 0 ? teamCount : null },
    { id: 'approved', label: '모두인정', icon: Star, badge: approvedCount > 0 ? approvedCount : null },
    { id: 'settings', label: '설정', icon: Settings },
  ]

  return (
    <nav className={styles.bottomNav} aria-label="하단 메뉴">
      <div className={styles.navInner}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={styles.iconWrap}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className={`${styles.badge} ${tab.id === 'approved' ? styles.badgeGold : ''}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={styles.label}>{tab.label}</span>
              {isActive && <span className={styles.activeIndicator} />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
