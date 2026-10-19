/**
 * PinMate 경량 REST API 서버 (Zero-Dependency)
 * 별도 패키지 설치 없이 `node server.js` 명령어로 즉시 구동 가능합니다.
 * 백엔드 개발자 3명이 API 스펙 및 데이터 플로우를 테스트하는 목적으로 사용할 수 있으며,
 * 추후 Spring Boot 또는 Express로 전환 시 참조 표준으로 활용됩니다.
 */
const http = require('http')
const url = require('url')

const PORT = process.env.PORT || 4000

// 인메모리 목 데이터
let teams = [
  {
    id: 'team-1',
    name: '🍜 서울 맛집 탐방대',
    memberCount: 3,
    pinCount: 6,
    myBadge: '모두 인정 2곳',
    createdAt: '2026-10-01',
    members: [
      { id: 'user-1', nickname: '김태영', initials: '김', avatarColor: '#6C63FF' },
      { id: 'user-2', nickname: '이수진', initials: '이', avatarColor: '#FF6B9D' },
      { id: 'user-3', nickname: '박지훈', initials: '박', avatarColor: '#10D9A4' },
    ],
  },
  {
    id: 'team-2',
    name: '🏕️ 부산 여행 준비',
    memberCount: 2,
    pinCount: 3,
    myBadge: null,
    createdAt: '2026-10-10',
    members: [
      { id: 'user-1', nickname: '김태영', initials: '김', avatarColor: '#6C63FF' },
      { id: 'user-2', nickname: '이수진', initials: '이', avatarColor: '#FF6B9D' },
    ],
  },
]

let pins = [
  {
    id: 'pin-1',
    teamId: 'team-1',
    name: '광장시장 빈대떡',
    address: '서울 종로구 창경궁로 88',
    category: 'food',
    lat: 37.5699,
    lng: 126.9990,
    recommenders: ['user-1', 'user-2', 'user-3'],
    isAllApproved: true,
    allApprovedAt: '2026-10-05T14:32:00Z',
    addedBy: 'user-1',
    memo: '숙주나물 빈대떡이 진짜 맛있음! 시장 분위기도 최고',
    visitedBy: ['user-1', 'user-2'],
    addedAt: '2026-10-03T10:00:00Z',
  },
  {
    id: 'pin-2',
    teamId: 'team-1',
    name: '블루보틀 삼청점',
    address: '서울 종로구 북촌로 1길 70',
    category: 'cafe',
    lat: 37.5821,
    lng: 126.9815,
    recommenders: ['user-1', 'user-2'],
    isAllApproved: false,
    addedBy: 'user-2',
    memo: '북촌 돌담길 옆 위치, 오리지널 뉴올리언즈 라떼 꼭 먹기',
    visitedBy: ['user-2'],
    addedAt: '2026-10-07T15:00:00Z',
  },
  {
    id: 'pin-3',
    teamId: 'team-1',
    name: '연트럴파크 루프탑바',
    address: '서울 마포구 연남동 227-22',
    category: 'drink',
    lat: 37.5605,
    lng: 126.9230,
    recommenders: ['user-3'],
    isAllApproved: false,
    addedBy: 'user-3',
    memo: '야경이 진짜 예쁨, 예약 필수',
    visitedBy: [],
    addedAt: '2026-10-09T18:00:00Z',
  },
]

// CORS 및 응답 헬퍼
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(data))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  const method = req.method

  // OPTIONS 프리플라이트
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  try {
    // 1. 헬스체크
    if (pathname === '/api/health' && method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', service: 'PinMate API Server', timestamp: new Date() })
    }

    // 2. 팀 목록 조회: GET /api/teams
    if (pathname === '/api/teams' && method === 'GET') {
      return sendJSON(res, 200, { success: true, data: teams })
    }

    // 3. 새 팀 생성: POST /api/teams
    if (pathname === '/api/teams' && method === 'POST') {
      const body = await parseBody(req)
      const newTeam = {
        id: `team-${Date.now()}`,
        name: body.name || '새 모임 지도',
        memberCount: 3,
        pinCount: 0,
        myBadge: null,
        createdAt: new Date().toISOString().split('T')[0],
        members: [
          { id: 'user-1', nickname: '김태영', initials: '김', avatarColor: '#6C63FF' },
          { id: 'user-2', nickname: '이수진', initials: '이', avatarColor: '#FF6B9D' },
          { id: 'user-3', nickname: '박지훈', initials: '박', avatarColor: '#10D9A4' },
        ],
      }
      teams.unshift(newTeam)
      return sendJSON(res, 201, { success: true, data: newTeam })
    }

    // 4. 핀 목록 조회: GET /api/pins?teamId=team-1
    if (pathname === '/api/pins' && method === 'GET') {
      const teamId = parsedUrl.query.teamId
      const result = teamId ? pins.filter(p => p.teamId === teamId) : pins
      return sendJSON(res, 200, { success: true, data: result })
    }

    // 5. 새 핀 등록: POST /api/pins
    if (pathname === '/api/pins' && method === 'POST') {
      const body = await parseBody(req)
      const newPin = {
        id: `pin-${Date.now()}`,
        teamId: body.teamId,
        name: body.name,
        address: body.address,
        category: body.category || 'food',
        lat: Number(body.lat),
        lng: Number(body.lng),
        recommenders: ['user-1'],
        isAllApproved: false,
        addedBy: 'user-1',
        memo: body.memo || '',
        visitedBy: [],
        addedAt: new Date().toISOString(),
      }
      pins.unshift(newPin)

      // 팀의 핀 카운트 증가
      const targetTeam = teams.find(t => t.id === body.teamId)
      if (targetTeam) targetTeam.pinCount++

      return sendJSON(res, 201, { success: true, data: newPin })
    }

    // 6. 장소 추천 토글: POST /api/pins/:id/recommend
    const recommendMatch = pathname.match(/^\/api\/pins\/([^\/]+)\/recommend$/)
    if (recommendMatch && method === 'POST') {
      const pinId = recommendMatch[1]
      const body = await parseBody(req)
      const userId = body.userId || 'user-1'
      const targetPin = pins.find(p => p.id === pinId)

      if (!targetPin) {
        return sendJSON(res, 404, { success: false, message: '핀을 찾을 수 없습니다.' })
      }

      const already = targetPin.recommenders.includes(userId)
      targetPin.recommenders = already
        ? targetPin.recommenders.filter(id => id !== userId)
        : [...targetPin.recommenders, userId]

      // 팀원 전원 추천 여부 계산
      const targetTeam = teams.find(t => t.id === targetPin.teamId)
      const memberCount = targetTeam?.members?.length || 3
      const isAllApproved = memberCount >= 2 && targetPin.recommenders.length >= memberCount

      targetPin.isAllApproved = isAllApproved
      if (isAllApproved && !targetPin.allApprovedAt) {
        targetPin.allApprovedAt = new Date().toISOString()
      }

      return sendJSON(res, 200, { success: true, data: targetPin })
    }

    // 404 Not Found
    sendJSON(res, 404, { success: false, message: 'API 경로를 찾을 수 없습니다.' })
  } catch (err) {
    console.error('API 서버 오류:', err)
    sendJSON(res, 500, { success: false, error: err.message })
  }
})

server.listen(PORT, () => {
  console.log(`===============================================`)
  console.log(` PinMate Mock API Server Running on port ${PORT}`)
  console.log(` Health check: http://localhost:${PORT}/api/health`)
  console.log(` Teams list:   http://localhost:${PORT}/api/teams`)
  console.log(` Pins list:    http://localhost:${PORT}/api/pins`)
  console.log(`===============================================`)
})
