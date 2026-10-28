/**
 * 인증 및 회원가입 관련 API 클라이언트
 * 서버는 실패 사유를 결과 코드로만 내려주므로, 화면 문구는 여기서 정한다
 */
import { send, request, CODE } from '../../lib/apiClient'

const INVITE_MESSAGES = {
  [CODE.INVITE_FAIL]: '유효하지 않거나 만료된 초대 코드입니다.',
  [CODE.INVITE_BLOCKED]: '초대 코드를 여러 번 잘못 입력했습니다. 5분 뒤에 다시 시도해주세요.',
}

const SIGNUP_MESSAGES = {
  [CODE.SIGNUP_FAIL_CODE]: '가입 코드가 올바르지 않습니다.',
  [CODE.SIGNUP_BLOCKED]: '가입 코드를 여러 번 잘못 입력했습니다. 5분 뒤에 다시 시도해주세요.',
  [CODE.SIGNUP_FAIL_EXISTS]: '이미 사용 중인 아이디입니다.',
  [CODE.SIGNUP_FAIL_NICKNAME]: '이미 사용 중인 닉네임입니다.',
}

const LOGIN_MESSAGES = {
  [CODE.LOGIN_FAIL]: '아이디 또는 비밀번호가 올바르지 않습니다.',
  [CODE.LOGIN_BLOCKED]: '로그인에 여러 번 실패했습니다. 5분 뒤에 다시 시도해주세요.',
}

const postJson = (path, body) => send(path, { method: 'POST', body: JSON.stringify(body) })

/** 팀 초대 코드 확인. @returns {Promise<{ valid: boolean, teamId?, teamName?, message? }>} 코드가 틀려도 에러 대신 valid: false */
export async function checkInviteCodeApi(code) {
  const res = await send(`/auth/invite/check?code=${encodeURIComponent(code)}`)
  if (res.code === CODE.SUCCESS) {
    return { valid: true, ...res.data }
  }
  if (INVITE_MESSAGES[res.code]) {
    return { valid: false, message: INVITE_MESSAGES[res.code] }
  }
  throw new Error(res.message || '초대 코드 확인에 실패했습니다.')
}

/** 서비스 가입 코드로 가입만 하고 로그인하지 않는다. 성공하면 로그인 화면에서 다시 로그인한다 */
export async function signupApi({ loginId, password, passwordConfirm, nickname, email, signupCode }) {
  const res = await postJson('/auth/signup', { loginId, password, passwordConfirm, nickname, email, signupCode })
  if (res.code !== CODE.SUCCESS) {
    throw new Error(SIGNUP_MESSAGES[res.code] || res.message || '회원가입에 실패했습니다.')
  }
}

export async function loginApi({ loginId, password }) {
  const res = await postJson('/auth/login', { loginId, password })
  if (res.code !== CODE.SUCCESS) {
    throw new Error(LOGIN_MESSAGES[res.code] || res.message || '로그인에 실패했습니다.')
  }
  return res.data
}

// 내 계정 관리 (로그인 필요). 실패 사유는 서버 message 를 그대로 보여준다
export const changePasswordApi = ({ currentPassword, newPassword }) =>
  request('/users/me/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })

/** @returns {Promise<{ nickname, initials, avatarId, avatarBg }>} */
export const updateProfileApi = ({ nickname, avatarId, avatarBg }) =>
  request('/users/me', { method: 'PATCH', body: JSON.stringify({ nickname, avatarId, avatarBg }) })

export const withdrawApi = () => request('/users/me', { method: 'DELETE' })
