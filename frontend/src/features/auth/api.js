/**
 * 인증 및 회원가입 관련 API 클라이언트
 */

export async function checkInviteCodeApi(code) {
  const res = await fetch(`/api/auth/invite/check?code=${encodeURIComponent(code)}`)
  const json = await res.json()
  if (!json.success && json.message) {
    throw new Error(json.message)
  }
  return json.data
}

export async function signupApi({ loginId, password, nickname, email, inviteCode }) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId,
      password,
      nickname,
      email,
      inviteCode: inviteCode ? inviteCode.trim() : null,
    }),
  })
  const json = await res.json()
  if (!json.success || !res.ok) {
    throw new Error(json.message || '회원가입에 실패했습니다.')
  }
  return json.data
}

export async function loginApi({ loginId, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  })
  const json = await res.json()
  if (!json.success || !res.ok) {
    throw new Error(json.message || '아이디 또는 비밀번호가 올바르지 않습니다.')
  }
  return json.data
}
