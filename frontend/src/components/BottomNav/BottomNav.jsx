import { Map, Users, List, UserPlus, Bell, Settings } from 'lucide-react'
import styles from './BottomNav.module.css'

/**
 * 모바일/웹 공용 하단 내비게이션 바
 * - 지도(메인)
 * - 모임 목록 / 전환
 * - 장소 목록
 * - 친구 (받은 요청 배지)
 * - 알림 (동기화 알림 배지)
 * - 설정
 * 배지는 '처리할 것이 있다'는 표시로만 쓴다 (받은 친구 요청, 처리 안 한 알림). 전체 개수는 각 패널 안에서 보여준다
 */
export default function BottomNav({ activeTab, onTabChange, friendCount = 0, notificationCount = 0, variant = 'bottom' }) {
  const tabs = [
    { id: 'map', label: '지도', icon: Map },
    { id: 'teams', label: '모임', icon: Users },
    { id: 'places', label: '장소 목록', icon: List },
    { id: 'friends', label: '친구', icon: UserPlus, badge: friendCount, badgeLabel: '받은 친구 요청' },
    { id: 'notifications', label: '알림', icon: Bell, badge: notificationCount, badgeLabel: '처리 안 한 알림' },
    { id: 'settings', label: '설정', icon: Settings },
  ]

  return (
    <nav className={variant === 'desktop' ? styles.desktopNav : styles.bottomNav} aria-label={variant === 'desktop' ? '주 메뉴' : '하단 메뉴'}>
      <div className={styles.navInner}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const hasBadge = tab.badge > 0
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={hasBadge ? `${tab.label}, ${tab.badgeLabel} ${tab.badge}건` : undefined}
            >
              <div className={styles.iconWrap}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {hasBadge && (
                  <span className={styles.badge} aria-hidden="true">
                    {tab.badge > 99 ? '99+' : tab.badge}
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
