import { AVATARS, getAvatarColor } from '../../features/auth/avatars'

// 크기·모양은 각 화면의 className 이 정하고, 캐릭터 이미지는 그 동그라미를 꽉 채운다
const IMAGE_STYLE = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }

/**
 * 멤버 동그라미
 * - 설정에서 캐릭터를 골랐으면 캐릭터 + 프로필 배경색, 아니면 팀 색 + 이니셜
 * - 지도 핀·필터 점은 모임 안에서 겹치지 않는 팀 색(avatarColor)을 따로 쓴다
 * - muted: 배경을 회색으로 (예: 추천하지 않은 멤버)
 */
export default function MemberAvatar({ member, className, title, muted = false }) {
  const avatar = AVATARS.find(a => a.id === member.avatarId)
  const background = muted
    ? 'var(--bg-hover)'
    : avatar ? getAvatarColor(member.avatarBg) : (member.avatarColor || member.color)
  return (
    <div className={className} style={{ background }} title={title}>
      {avatar ? <img src={avatar.src} alt="" style={IMAGE_STYLE} /> : member.initials}
    </div>
  )
}
