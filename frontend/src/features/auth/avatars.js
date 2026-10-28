export const AVATARS = [
  { id: 'cat', name: '고양이', src: '/avatars/cat-transparent.png' },
  { id: 'dog', name: '강아지', src: '/avatars/dog-transparent.png' },
  { id: 'rabbit', name: '토끼', src: '/avatars/rabbit-transparent.png' },
  { id: 'bear', name: '곰', src: '/avatars/bear-transparent.png' },
  { id: 'fox', name: '여우', src: '/avatars/fox-transparent.png' },
  { id: 'panda', name: '판다', src: '/avatars/panda-transparent.png' },
  { id: 'penguin', name: '펭귄', src: '/avatars/penguin-transparent.png' },
  { id: 'otter', name: '수달', src: '/avatars/otter-transparent.png' },
]

export function getAvatar(id) {
  return AVATARS.find(avatar => avatar.id === id) || AVATARS[0]
}

export const AVATAR_BACKGROUNDS = [
  { name: '바이올렛', value: '#6c63ff' },
  { name: '라벤더', value: '#b5a2dc' },
  { name: '로즈', value: '#d695b1' },
  { name: '피치', value: '#efb594' },
  { name: '버터', value: '#e6cc83' },
  { name: '민트', value: '#96cab6' },
  { name: '틸', value: '#448b8b' },
  { name: '스카이', value: '#8ab8db' },
  { name: '슬레이트', value: '#65718b' },
  { name: '미드나잇', value: '#25233f' },
]

export function getAvatarColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : AVATAR_BACKGROUNDS[0].value
}
