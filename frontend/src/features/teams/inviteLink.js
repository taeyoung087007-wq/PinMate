/**
 * 모임 초대 링크 조립.
 *
 * - 도메인은 지금 접속한 주소(window.location.origin)를 그대로 쓴다.
 *   localhost든 배포 도메인이든 자동으로 맞고, 주소를 코드에 박아둘 필요가 없다.
 * - 경로는 /login?invite=코드 다. App.jsx의 LoginRoute가 이 쿼리를 읽어
 *   로그인 전이면 가입 화면, 로그인 후면 참여 확인 화면을 띄운다.
 *
 * 초대 링크를 만드는 곳이 여러 군데로 흩어지면 한쪽만 규칙이 달라지므로(실제로 그런 적이 있다)
 * 반드시 이 함수를 쓴다.
 */

/** 코드 없이 경로까지만 (가린 링크 표시용) */
export function inviteBase() {
  return `${window.location.origin}/login?invite=`
}

/** @param {string | null | undefined} inviteCode @returns {string} 코드가 없으면 빈 문자열 */
export function buildInviteLink(inviteCode) {
  if (!inviteCode) return ''
  return `${inviteBase()}${encodeURIComponent(inviteCode)}`
}
