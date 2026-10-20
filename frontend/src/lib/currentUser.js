export const DEFAULT_USER = {
  id: 'user-1',
  loginId: 'user-1',
  nickname: '김태영',
  email: 'taeyoung@pinmate.io',
  avatarColor: '#6C63FF',
  initials: '김',
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('pinmate_user')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to parse pinmate_user', e)
  }
  return DEFAULT_USER
}

export function setCurrentUserStorage(user) {
  if (user) {
    localStorage.setItem('pinmate_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('pinmate_user')
  }
}

export const CURRENT_USER = getCurrentUser()
