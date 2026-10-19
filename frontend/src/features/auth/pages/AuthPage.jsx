import { useState } from 'react'
import { MapPin, Users, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import styles from './AuthPage.module.css'

/**
 * 로그인 및 회원가입 페이지
 * - 로그인 / 회원가입 탭 전환
 * - 비밀번호 표시/숨김 토글
 * - '데모로 바로 체험하기' 원클릭 로그인
 */
export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ id: 'taeyoung', password: '••••••••', nickname: '김태영' })

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onLogin(form)
  }

  return (
    <div className={styles.container}>
      {/* 배경 장식 애니메이션 블롭 */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      {/* 배경 그리드 오버레이 */}
      <div className={styles.grid} />

      <div className={styles.content}>
        {/* 서비스 로고 */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <MapPin size={28} strokeWidth={2.5} color="white" />
          </div>
          <div>
            <h1 className={styles.logoTitle}>PinMate</h1>
            <p className={styles.logoSub}>친구들과 함께 만드는 장소 공유 지도</p>
          </div>
        </div>

        {/* 인증 카드 */}
        <div className={`${styles.card} glass-card animate-slide-up`}>
          {/* 탭 전환 */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => setMode('login')}
            >
              로그인
            </button>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => setMode('signup')}
            >
              회원가입
            </button>
          </div>

          <form className={styles.form} onSubmit={submit}>
            {mode === 'signup' && (
              <div className={styles.field}>
                <label className={styles.label}>
                  <Users size={14} />
                  닉네임
                </label>
                <input
                  className="input"
                  type="text"
                  name="nickname"
                  placeholder="지도 마커에 표시될 내 이름"
                  value={form.nickname}
                  onChange={handle}
                  required={mode === 'signup'}
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>
                <Lock size={14} />
                아이디 (이메일)
              </label>
              <input
                className="input"
                type="text"
                name="id"
                placeholder="아이디를 입력하세요"
                value={form.id}
                onChange={handle}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <Lock size={14} />
                비밀번호
              </label>
              <div className={styles.pwWrap}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="비밀번호를 입력하세요"
                  value={form.password}
                  onChange={handle}
                  required
                />
                <button
                  type="button"
                  className={styles.pwToggle}
                  onClick={() => setShowPw(p => !p)}
                  title={showPw ? '비밀번호 숨김' : '비밀번호 표시'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>
              {mode === 'login' ? '로그인하기' : '가입하기'}
              <ArrowRight size={16} />
            </button>

            {/* 원클릭 데모 체험 버튼 */}
            <button
              type="button"
              className={`btn btn-ghost ${styles.demoBtn}`}
              onClick={() => onLogin(form)}
            >
              <Sparkles size={14} />
              데모로 바로 체험하기
            </button>
          </form>
        </div>

        {/* 서비스 핵심 기능 소개 배지 */}
        <div className={styles.features}>
          {[
            { icon: '📍', text: '장소를 팀원과 한 지도에서 공유' },
            { icon: '⭐', text: '모두가 인정한 검증된 맛집 배지' },
            { icon: '🗺️', text: '카테고리별 다채로운 마커' },
          ].map((f, i) => (
            <div key={i} className={styles.featureItem} style={{ animationDelay: `${i * 0.1}s` }}>
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
