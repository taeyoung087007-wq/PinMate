import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { checkInviteCodeApi } from '../../auth/api'
import { getCurrentUser } from '../../../lib/currentUser'
import { fetchTeams, joinTeamApi } from '../api'
import styles from './InvitePage.module.css'

/**
 * 로그인한 상태에서 초대 링크(/login?invite=코드)를 열었을 때의 참여 확인 화면
 * - 바로 참여시키지 않고, 어떤 모임인지 보여준 뒤 사용자가 고르게 한다
 * - 이미 멤버면 참여 대신 이동만 안내한다
 */
export default function InvitePage({ code }) {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [invite, setInvite] = useState(null) // { teamId, teamName, alreadyMember }
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    Promise.all([checkInviteCodeApi(code), fetchTeams(user.id)])
      .then(([check, myTeams]) => {
        if (!check?.valid) {
          setError(check?.message || '유효하지 않거나 만료된 초대 코드입니다.')
          return
        }
        setInvite({
          teamId: String(check.teamId),
          teamName: check.teamName,
          alreadyMember: myTeams.some(t => String(t.id) === String(check.teamId)),
        })
      })
      .catch(e => setError(e.message || '초대 정보를 확인하지 못했습니다.'))
  }, [code, user.id])

  const goToTeam = (teamId) => navigate(`/teams/${teamId}`, { replace: true })

  const handleJoin = async () => {
    setJoining(true)
    setError('')
    try {
      const team = await joinTeamApi(code, user.id)
      goToTeam(team.id)
    } catch (e) {
      setError(e.message)
      setJoining(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-card animate-scale-up`}>
        <div className={styles.icon}><Users size={22} color="white" /></div>
        <h2 className={styles.title}>모임 초대</h2>

        {!invite && !error && <p className={styles.desc}>초대 정보를 확인하는 중...</p>}

        {invite && (
          <>
            <p className={styles.teamName}>{invite.teamName}</p>
            <p className={styles.desc}>
              {invite.alreadyMember
                ? '이미 참여 중인 모임이에요.'
                : <><strong>{user.nickname}</strong> 계정으로 이 모임에 참여할까요?</>}
            </p>
          </>
        )}

        {error && <p className={styles.errorText} role="alert">{error}</p>}

        <div className={styles.actions}>
          {invite && !invite.alreadyMember && (
            <button type="button" className="btn btn-primary" onClick={handleJoin} disabled={joining}>
              {joining ? '참여하는 중...' : '참여하기'}
            </button>
          )}
          {invite?.alreadyMember && (
            <button type="button" className="btn btn-primary" onClick={() => goToTeam(invite.teamId)}>
              모임으로 이동
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/', { replace: true })}>
            {invite && !invite.alreadyMember ? '나중에' : '홈으로'}
          </button>
        </div>
      </div>
    </div>
  )
}
