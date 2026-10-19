import { useEffect } from 'react'
import { Sparkles, Star, Award, Check } from 'lucide-react'
import styles from './CelebrationModal.module.css'

/**
 * '모두 인정' 달성 축하 팝업 컴포넌트
 * 팀원 전원이 추천했을 때 뜨는 화려한 축하 연출
 */
export default function CelebrationModal({ pin, onClose }) {
  useEffect(() => {
    // 3.5초 후 자동 닫기 또는 사용자가 버튼 클릭 시 닫기
    const timer = setTimeout(() => {
      onClose()
    }, 4500)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!pin) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.confettiContainer}>
        {/* 장식용 파티클 */}
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className={styles.confettiPiece}
            style={{
              left: `${(i * 3.3) % 100}%`,
              animationDelay: `${(i % 5) * 0.15}s`,
              backgroundColor: ['#FFBA08', '#FF6B6B', '#6C63FF', '#06D6A0', '#FF9F1C', '#E0AAFF'][i % 6],
              transform: `rotate(${i * 12}deg)`,
            }}
          />
        ))}
      </div>

      <div className={`${styles.card} glass-card animate-scale-up`} onClick={e => e.stopPropagation()}>
        <div className={styles.starIconWrapper}>
          <div className={styles.glowRing} />
          <Star size={44} className={styles.goldStar} fill="#FFBA08" color="#FFD166" />
        </div>

        <div className={styles.badgeLabel}>
          <Sparkles size={14} />
          <span>모두 인정 달성!</span>
        </div>

        <h3 className={styles.placeName}>"{pin.name}"</h3>

        <p className={styles.description}>
          우리 팀원 전원이 추천하여 <strong>모두가 인정한 공식 명소</strong>로 등극했습니다! 🌟
        </p>

        <div className={styles.infoBox}>
          <div className={styles.infoItem}>
            <Award size={16} color="#FFBA08" />
            <span>골드 마커 획득</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <Check size={16} color="#06D6A0" />
            <span>팀 전원 추천 완료</span>
          </div>
        </div>

        <button className={`btn btn-primary ${styles.confirmBtn}`} onClick={onClose}>
          멋져요! 확인
        </button>
      </div>
    </div>
  )
}
