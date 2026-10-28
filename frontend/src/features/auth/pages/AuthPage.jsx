import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin, Users, Lock, Eye, EyeOff, ArrowRight,
  Sparkles, CheckCircle2, AlertCircle, Link2
} from 'lucide-react'
import { signupApi, loginApi, checkInviteCodeApi } from '../api'
import { setCurrentUserStorage } from '../../../lib/currentUser'
import styles from './AuthPage.module.css'

/**
 * 로그인 및 회원가입 페이지
 * - 가입: 서비스 가입 코드 + 아이디·비밀번호·닉네임 입력. 가입 후에는 로그인 탭으로 돌아가 다시 로그인한다
 * - 팀 초대 링크(?invite=코드)로 들어왔으면 어떤 모임인지 보여주고,
 *   로그인하면 같은 링크의 참여 확인 화면(InvitePage)으로 이어진다
 */
export default function AuthPage({ onLogin }) {
  const [searchParams] = useSearchParams()
  const inviteParam = searchParams.get('invite')

  const [mode, setMode] = useState(inviteParam ? 'signup' : 'login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [invitedTeamName, setInvitedTeamName] = useState('')

  // 폼 입력 상태
  const [form, setForm] = useState({
    id: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    signupCode: '',
    termsAgreed: true,
  })

  // 팀 초대 링크로 들어왔으면 어떤 모임인지 미리 보여준다 (참여는 로그인 후)
  useEffect(() => {
    if (!inviteParam) return
    checkInviteCodeApi(inviteParam)
      .then(res => {
        if (res.valid) setInvitedTeamName(res.teamName)
        else setError(res.message)
      })
      .catch(e => setError(e.message || '초대 정보를 확인하지 못했습니다.'))
  }, [inviteParam])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (error) setError('')
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
      if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        setError('비밀번호는 8자 이상, 영문과 숫자를 함께 입력해주세요.')
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

      if (!form.signupCode.trim()) {
        setError('가입 코드를 입력해주세요.')
        return
      }

      setLoading(true)
      try {
        await signupApi({
          loginId: form.id.trim(),
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          nickname: form.nickname.trim(),
          signupCode: form.signupCode.trim(),
        })

        // 가입만 되고 로그인되지는 않는다. 아이디는 남겨두고 로그인 탭으로 돌아간다
        setForm(p => ({ ...p, password: '', passwordConfirm: '' }))
        setMode('login')
        setSuccessMsg(invitedTeamName
          ? `🎉 가입이 완료되었습니다! 로그인하면 [${invitedTeamName}] 모임에 참여할 수 있어요.`
          : '🎉 가입이 완료되었습니다! 로그인해주세요.')
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
            {/* 팀 초대 링크로 들어온 경우: 어떤 모임인지 안내 */}
            {invitedTeamName && (
              <div className={styles.inviteBadge}>
                <CheckCircle2 size={15} />
                <span>
                  <strong>{invitedTeamName}</strong>에 초대되었습니다! (로그인 후 참여)
                </span>
              </div>
            )}

            {/* 회원가입 전용: 서비스 가입 코드 */}
            {mode === 'signup' && (
              <div className={styles.field}>
                <label className={styles.label}>
                  <Link2 size={14} />
                  가입 코드
                </label>
                <input
                  className="input"
                  type="text"
                  name="signupCode"
                  placeholder="운영자에게 받은 가입 코드"
                  value={form.signupCode}
                  onChange={handleInputChange}
                  autoComplete="off"
                  required
                />
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
                  : '가입하기'}
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
