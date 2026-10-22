import { useState } from 'react'
import { X, MapPin, Copy, QrCode, Users, Link2, Check } from 'lucide-react'
import { buildInviteLink } from '../inviteLink'
import styles from './TeamCreateModal.module.css'

/**
 * 새 팀 생성 및 초대 링크 발급 모달
 * - 팀 이름 입력
 * - 팀 생성 완료 후 초대 링크 복사 및 QR 코드 안내
 * - 즉시 지도로 이동
 */
export default function TeamCreateModal({ onClose, onCreateTeam }) {
  const [step, setStep] = useState('create') // 'create' | 'invite'
  const [name, setName] = useState('')
  const [createdTeam, setCreatedTeam] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // 초대 링크는 공용 함수로 만든다 (도메인은 현재 접속 주소를 자동으로 따라간다)
  const inviteLink = buildInviteLink(createdTeam?.inviteCode)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || submitting) return

    // 상위 컴포넌트에 팀 생성 요청 (서버가 초대 코드를 발급)
    setSubmitting(true)
    setError('')
    try {
      setCreatedTeam(await onCreateTeam(name.trim()))
      setStep('invite')
    } catch (err) {
      setError(`팀 생성에 실패했습니다: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFinish = () => {
    onClose(createdTeam)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} glass-card animate-slide-up`}>
        {/* 모달 헤더 */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            {step === 'create' ? <><Users size={16} /> 새 팀 만들기</> : <><Link2 size={16} /> 팀원 초대하기</>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => onClose()}>
            <X size={16} />
          </button>
        </div>

        {step === 'create' ? (
          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.field}>
              <label className={styles.label}>팀 이름</label>
              <input
                className="input"
                placeholder="예: 🍜 성수동 맛집 탐험대"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <span className={styles.helpText}>친구들과 함께 부를 멋진 팀 이름을 정해보세요.</span>
              {error && <span className={styles.errorText} role="alert">{error}</span>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px' }} disabled={submitting}>
              <MapPin size={15} />
              팀 생성하기
            </button>
          </form>
        ) : (
          <div className={styles.inviteContent}>
            <div className={styles.teamCreated}>
              <div className={styles.createdIcon}>🎉</div>
              <div className={styles.createdText}>
                <strong>{name}</strong> 팀이 생성됐어요!
              </div>
              <div className={styles.createdSub}>초대 링크를 복사해 친구들에게 공유해보세요</div>
            </div>

            <div className={styles.linkBox}>
              <code className={styles.linkText}>{inviteLink}</code>
              <button
                type="button"
                className={`btn ${copied ? 'btn-secondary' : 'btn-primary'} btn-icon`}
                onClick={copyLink}
                title="링크 복사"
              >
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              </button>
            </div>

            {copied && (
              <div className={styles.copiedMsg}>✓ 클립보드에 복사되었습니다!</div>
            )}

            <div className={styles.qrPlaceholder}>
              <QrCode size={48} color="var(--text-muted)" />
              <span className={styles.qrText}>친구 스마트폰 카메라로 QR 스캔</span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px' }}
              onClick={handleFinish}
            >
              지도로 바로 이동하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
