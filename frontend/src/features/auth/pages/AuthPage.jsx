import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin, Users, Lock, Eye, EyeOff, ArrowRight,
  Sparkles, CheckCircle2, AlertCircle, Link2, Sparkle
} from 'lucide-react'
import { signupApi, loginApi, checkInviteCodeApi } from '../api'
import { setCurrentUserStorage } from '../../../lib/currentUser'
import styles from './AuthPage.module.css'

/**
 * 로그인 및 회원가입 페이지
 * - 기획안 UI Flow 완벽 반영:
 *   1. 초대코드 확인 (초대 링크 접속 시 자동 입력 및 자동 검증)
 *   2. 회원 정보 입력 (아이디, 비밀번호, 닉네임)
 *   3. 가입 완료 시 초대받은 팀 자동 참여 후 메인 지도 진입
 *   4. 초대코드 없는 사용자를 위한 '새 모임으로 가입' 모드 지원
 */
export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams()
  const inviteParam = searchParams.get('invite')

  const [mode, setMode] = useState(inviteParam ? 'signup' : 'login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // 초대 코드 상태
  const [inviteCode, setInviteCode] = useState(inviteParam || '')
  const [inviteValid, setInviteValid] = useState(null) // null | boolean
  const [invitedTeamName, setInvitedTeamName] = useState('')
  const [inviteChecking, setInviteChecking] = useState(false)
  const [isNoCodeMode, setIsNoCodeMode] = useState(false) // 초대코드 없이 시작하기

  // 폼 입력 상태
  const [form, setForm] = useState({
    id: inviteParam ? '' : 'taeyoung',
    password: inviteParam ? '' : '••••••••',
    passwordConfirm: '',
    nickname: '',
    termsAgreed: true,
  })

  // URL에 초대 코드가 있으면 자동 검증
  useEffect(() => {
    if (inviteParam) {
      setMode('signup')
      setInviteCode(inviteParam)
      handleVerifyInvite(inviteParam)
    }
  }, [inviteParam])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (error) setError('')
  }

  // 초대 코드 검증 함수
  const handleVerifyInvite = async (codeToVerify) => {
    const code = (codeToVerify !== undefined ? codeToVerify : inviteCode).trim()
    if (!code) {
      setInviteValid(false)
      setError('초대 코드를 입력해주세요.')
      return
    }

    setInviteChecking(true)
    setError('')
    try {
      const res = await checkInviteCodeApi(code)
      if (res.valid) {
        setInviteValid(true)
        setInvitedTeamName(res.teamName)
      } else {
        setInviteValid(false)
        setInvitedTeamName('')
        setError(res.message || '유효하지 않거나 만료된 초대 코드입니다.')
      }
    } catch (e) {
      setInviteValid(false)
      setInvitedTeamName('')
      setError(e.message || '초대 코드 확인에 실패했습니다.')
    } finally {
      setInviteChecking(false)
    }
  }

  // 폼 제출 (로그인 또는 회원가입)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (mode === 'login') {
      // 1. 로그인 처리
      setLoading(true)
      try {
        const userData = await loginApi({
          loginId: form.id.trim(),
          password: form.password,
        })
        setCurrentUserStorage(userData)
        onLogin(userData)
      } catch (err) {
        // 기존 데모 사용자 호환
        if (form.id === 'taeyoung') {
          onLogin({
            id: 'user-1',
            loginId: 'user-1',
            nickname: '김태영',
            email: 'taeyoung@pinmate.io',
            avatarColor: '#6C63FF',
            initials: '김',
          })
          return
        }
        setError(err.message || '아이디 또는 비밀번호가 올바르지 않습니다.')
      } finally {
        setLoading(false)
      }
    } else {
      // 2. 회원가입 처리
      if (!form.nickname.trim()) {
        setError('닉네임을 입력해주세요.')
        return
      }
      if (!form.id.trim()) {
        setError('아이디를 입력해주세요.')
        return
      }
      if (!form.password || form.password.length < 4) {
        setError('비밀번호는 4자 이상 입력해주세요.')
        return
      }
      if (form.password !== form.passwordConfirm) {
        setError('비밀번호 확인이 일치하지 않습니다.')
        return
      }
      if (!form.termsAgreed) {
        setError('이용약관 및 개인정보 처리방침에 동의해주세요.')
        return
      }

      // 초대 코드가 필수인 모드일 경우 사전 검증 확인
      if (!isNoCodeMode && inviteValid !== true) {
        if (!inviteCode.trim()) {
          setError('초대 코드를 입력하거나 "새 모임으로 가입하기"를 선택해주세요.')
          return
        }
        // 미검증 상태라면 즉시 검증 시도
        try {
          const res = await checkInviteCodeApi(inviteCode.trim())
          if (!res.valid) {
            setError(res.message || '유효하지 않은 초대 코드입니다.')
            return
          }
        } catch (e) {
          setError(e.message || '초대 코드 검증 실패')
          return
        }
      }

      setLoading(true)
      try {
        const newUser = await signupApi({
          loginId: form.id.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
          email: `${form.id.trim()}@pinmate.io`,
          inviteCode: isNoCodeMode ? null : inviteCode.trim(),
        })

        setCurrentUserStorage(newUser)
        const teamMsg = newUser.defaultTeam ? ` [${newUser.defaultTeam.name}] 모임에 참여되었습니다!` : ''
        setSuccessMsg(`🎉 가입이 완료되었습니다!${teamMsg}`)

        // 가입 완료 후 메인 지도로 바로 이동
        setTimeout(() => {
          onLogin(newUser)
        }, 800)
      } catch (err) {
        setError(err.message || '회원가입에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
  }

  // 브라우저 상태만 바꿔서는 서버의 모임 조회 권한을 얻을 수 없다.
  const handleDemoLogin = () => {
    setError('모임을 조회하려면 회원가입하거나 등록된 계정으로 로그인해주세요.')
  }

  return (
    <div className={styles.container}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />
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
          {/* 로그인 / 회원가입 탭 */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
            >
              회원가입
            </button>
          </div>

          {/* 에러 및 성공 안내 배너 */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className={styles.successBanner}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* 회원가입 전용 1단계: 초대 코드 영역 */}
            {mode === 'signup' && (
              <div className={styles.inviteCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.label}>
                    <Link2 size={14} />
                    팀 초대 코드
                  </label>
                  <button
                    type="button"
                    className={styles.toggleModeBtn}
                    onClick={() => {
                      setIsNoCodeMode(p => !p)
                      setError('')
                    }}
                  >
                    {isNoCodeMode ? '초대 코드로 참여하기' : '초대 코드가 없으신가요?'}
                  </button>
                </div>

                {!isNoCodeMode ? (
                  <>
                    <div className={styles.inviteRow}>
                      <input
                        className="input"
                        placeholder="예: seongsu123"
                        value={inviteCode}
                        onChange={e => {
                          setInviteCode(e.target.value)
                          setInviteValid(null)
                          setInvitedTeamName('')
                        }}
                      />
                      <button
                        type="button"
                        className={`btn btn-secondary ${styles.checkBtn}`}
                        onClick={() => handleVerifyInvite()}
                        disabled={inviteChecking || !inviteCode.trim()}
                      >
                        {inviteChecking ? '확인 중...' : '확인'}
                      </button>
                    </div>

                    {inviteValid === true && (
                      <div className={styles.inviteBadge}>
                        <CheckCircle2 size={15} />
                        <span>
                          <strong>{invitedTeamName}</strong>에 초대되었습니다! (가입 시 자동 참여)
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.noCodeBadge}>
                    <Sparkle size={14} />
                    <span>초대 코드 없이 가입하며 <strong>나만의 첫 모임</strong>이 자동 생성됩니다.</span>
                  </div>
                )}
              </div>
            )}

            {/* 회원가입 전용: 닉네임 입력 */}
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
                  placeholder="지도 마커에 표시될 내 이름 (예: 홍길동)"
                  value={form.nickname}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            {/* 아이디 입력 */}
            <div className={styles.field}>
              <label className={styles.label}>
                <Lock size={14} />
                아이디
              </label>
              <input
                className="input"
                type="text"
                name="id"
                placeholder={mode === 'signup' ? '아이디 (영문/숫자 3자 이상)' : '아이디를 입력하세요'}
                value={form.id}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* 비밀번호 입력 */}
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
                  placeholder="비밀번호 (4자 이상)"
                  value={form.password}
                  onChange={handleInputChange}
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

            {/* 회원가입 전용: 비밀번호 확인 & 약관 동의 */}
            {mode === 'signup' && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <Lock size={14} />
                    비밀번호 확인
                  </label>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    name="passwordConfirm"
                    placeholder="비밀번호를 한 번 더 입력하세요"
                    value={form.passwordConfirm}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <label className={styles.termsCheck}>
                  <input
                    type="checkbox"
                    name="termsAgreed"
                    checked={form.termsAgreed}
                    onChange={handleInputChange}
                  />
                  <span>서비스 이용약관 및 개인정보 처리방침에 동의합니다.</span>
                </label>
              </>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading
                ? '처리 중...'
                : mode === 'login'
                  ? '로그인하기'
                  : '가입 및 모임 참여하기'}
              <ArrowRight size={16} />
            </button>

            {/* 원클릭 데모 체험 버튼 */}
            <button
              type="button"
              className={`btn btn-ghost ${styles.demoBtn}`}
              onClick={handleDemoLogin}
            >
              <Sparkles size={14} />
              데모 계정으로 바로 둘러보기
            </button>
          </form>
        </div>

        {/* 서비스 핵심 기능 소개 배지 */}
        <div className={styles.features}>
          {[
            { icon: '📍', text: '친구들과 한 지도에서 장소 실시간 공유' },
            { icon: '⭐', text: '모두가 인정한 검증된 맛집 배지' },
            { icon: '🗺️', text: '카테고리별 다채로운 커스텀 마커' },
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
