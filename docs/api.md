# PinMate API 명세서

> 기준: `main` 브랜치 코드 (2026-10-27). API를 바꾸는 PR은 이 문서도 함께 고칩니다.
> 개인 지도·동기화 알림 API는 아직 구현되지 않았습니다 → [제안 API](#제안-api-미구현)

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [결과 코드](#2-결과-코드)
3. [인증 (auth)](#3-인증-auth)
4. [모임 (teams)](#4-모임-teams)
5. [장소 (pins)](#5-장소-pins)
6. [접속 상태 (presence)](#6-접속-상태-presence)
7. [길찾기 · 대중교통](#7-길찾기--대중교통)
8. [기타](#8-기타)
9. [프론트에서 직접 부르는 외부 API](#9-프론트에서-직접-부르는-외부-api)
10. [제안 API (미구현)](#제안-api-미구현)
11. [알려진 불일치](#알려진-불일치)

---

## 1. 공통 규칙

### 기본 주소

| 환경 | 주소 |
|---|---|
| 로컬 개발 | 프론트 `http://localhost:5173` → Vite 프록시 `/api` → 백엔드 `http://localhost:8080` |
| 배포 | 프론트 환경변수 `VITE_API_URL` (예: `https://api.example.com/api`) |

모든 경로는 `/api/` 로 시작합니다.

### 인증 — 세션 쿠키

- 로그인(`POST /api/auth/login`)에 성공하면 서버 세션이 만들어지고 브라우저에 세션 쿠키가 저장됩니다. 이후 요청은 쿠키로 사용자를 식별합니다.
- **사용자 ID를 요청 본문으로 보내지 않습니다.** 보내도 서버가 무시하고 세션 값을 씁니다(다른 사람 행세 방지).
- 로그인이 필요 없는 경로: `/api/auth/**`, `/api/health`. 나머지는 모두 로그인 필요.

### 상태를 바꾸는 요청의 필수 헤더 (CSRF 방어)

`GET`·`HEAD`·`OPTIONS` 를 뺀 모든 요청(`POST`·`PATCH`·`DELETE`)은 **두 가지를 모두** 갖춰야 합니다. 본문이 없는 요청도 `{}` 를 보냅니다.

```http
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

빠지면 컨트롤러에 들어가기 전에 `403` + `{"code":"99","message":"허용되지 않는 요청입니다.","data":null}` 을 받습니다. `frontend/src/lib/apiClient.js` 의 `send()` 가 자동으로 붙입니다.

### 응답 형식

HTTP 상태는 대부분 `200` 이고, 결과는 본문의 `code` 로 구분합니다.

```json
{ "code": "00", "message": null, "data": { } }
```

| 필드 | 설명 |
|---|---|
| `code` | 결과 코드 ([2. 결과 코드](#2-결과-코드)) |
| `message` | 실패 시 화면에 그대로 보여 줄 문구. 성공이면 대개 `null` |
| `data` | 성공 시 결과. 실패면 `null` |

HTTP 상태가 200이 아닌 경우:

| 상태 | 언제 | 본문 |
|---|---|---|
| 401 | 로그인 필요한 경로인데 세션 없음·만료 | `{"sessionExpired": true}` (공통 형식 아님). 프론트는 `/login` 으로 보냄 |
| 403 | 위 필수 헤더 누락 | `{"code":"99", "message":"허용되지 않는 요청입니다."}` |
| 400 | 읽을 수 없는 JSON, 경로 변수 형식 오류(예: `/pins/abc`), 필수 쿼리 누락 | `{"code":"99", "message":"잘못된 요청입니다."}` |
| 404 / 405 | 없는 경로, 메서드 불일치 | `{"code":"99", "message":"잘못된 요청입니다."}` |
| 500 | 컨트롤러 밖의 예상 못 한 오류 | `{"code":"99", "message":"처리 중 오류가 발생했습니다."}` |

### ID 표기

- 응답의 `id`, `teamId` 는 **문자열**입니다(예: `"12"`). 요청 경로·본문에는 숫자 그대로 넣습니다.
- **멤버·추천인·방문자는 `login_id` 로 표시합니다**(`members[].id`, `addedBy`, `recommenders[]`, `visitedBy[]`). 로그인 응답의 `id` 는 `user_id` 입니다. → [알려진 불일치](#알려진-불일치)

### 카테고리

API는 프론트 키를 씁니다. DB에는 오른쪽 값으로 저장됩니다.

| API (프론트) | DB `places.category` | 표시 |
|---|---|---|
| `food` | `restaurant` | 맛집 |
| `cafe` | `cafe` | 카페 |
| `drink` | `bar` | 술집 |
| `stay` | `stay` | 숙소 |
| `sight` | `attraction` | 명소 |
| `play` | `activity` | 놀거리 |
| `etc` | `etc` | 기타 |

등록·수정에서 이 7개 외의 값은 `90`, 빈 값은 `etc` 로 저장됩니다(대소문자 무시).

### 시도 제한

같은 키로 5번 실패하면 5분 동안 막힙니다(성공하면 초기화). 서버 메모리에만 저장되므로 서버를 재시작하면 풀립니다.

| 대상 | 키 | 막혔을 때 코드 |
|---|---|---|
| 로그인 | 아이디 + IP | `03` |
| 가입 코드 | IP | `13` |
| 초대 코드 (미리보기·참여 공용) | IP | `23` |

---

## 2. 결과 코드

`backend/.../cmmn/util/Constants.java` 와 `frontend/src/lib/apiClient.js` 의 `CODE` 가 같은 값을 유지합니다.

| 코드 | 이름 | 뜻 |
|---|---|---|
| `00` | SUCCESS | 성공 |
| `01` | LOGIN_FAIL | 아이디 또는 비밀번호 불일치 (둘을 구분하지 않음) |
| `03` | LOGIN_BLOCKED | 로그인 연속 실패로 잠시 차단 |
| `11` | SIGNUP_FAIL_CODE | 가입 코드 불일치 |
| `12` | SIGNUP_FAIL_EXISTS | 아이디 중복 |
| `13` | SIGNUP_BLOCKED | 가입 코드 연속 실패로 잠시 차단 |
| `14` | SIGNUP_FAIL_NICKNAME | 닉네임 중복 |
| `21` | INVITE_FAIL | 초대 코드 불일치·만료·회수 |
| `23` | INVITE_BLOCKED | 초대 코드 연속 실패로 잠시 차단 |
| `90` | INVALID | 입력 오류. `message` 를 그대로 표시 |
| `91` | NOT_FOUND | 대상 없음. **참여하지 않은 모임의 리소스도 91** (존재 여부를 숨김) |
| `92` | NO_PERMISSION | 권한 없음 (예: 등록자·owner가 아닌 장소 수정·삭제) |
| `99` | FAIL | 서버 오류 또는 위 HTTP 오류 |

---

## 3. 인증 (auth)

### `POST /api/auth/login` — 로그인

| 본문 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `loginId` | string | ✔ | 1~20자 |
| `password` | string | ✔ | 앞뒤 공백도 비밀번호로 취급 |

성공 `00` — 세션 쿠키가 새로 발급됩니다(세션 고정 공격 방지).

```json
{
  "id": "5",
  "loginId": "minji01",
  "nickname": "민지",
  "email": "minji@example.com",
  "avatarColor": "#6C63FF",
  "initials": "민",
  "defaultTeam": { "id": "1", "name": "주말 맛집 원정대" }
}
```

- `defaultTeam`: 참여 중인 모임 중 가장 최근에 만들어진 것. 없으면 `null`.
- `avatarColor`: 기본 모임에서의 내 색. 모임이 없으면 팔레트 첫 색.

실패: `01`, `03`, `99`

### `POST /api/auth/signup` — 가입

| 본문 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `loginId` | string | ✔ | 3~20자 |
| `password` | string | ✔ | 4자 이상, UTF-8 72바이트 이하 (BCrypt 한도) |
| `passwordConfirm` | string | ✔ | `password` 와 같아야 함 |
| `nickname` | string | ✔ | 2~30자, 서비스 전체에서 중복 불가 |
| `email` | string | | 형식 검사. **비우면 `{loginId}@pinmate.io` 로 저장** |
| `signupCode` | string | ✔ | 서비스 가입 코드 (서버 환경변수 `PINMATE_SIGNUP_CODE`. 비어 있으면 아무도 가입 불가) |

성공 `00` (`data: null`). 가입 후 로그인 화면으로 돌아가며, **자동 로그인·자동 팀 참여는 하지 않습니다.** 팀 참여는 로그인 후 초대 링크로 합니다.

실패: `90` (입력 규칙), `11`, `12`, `13`, `14`, `99`

- 검사 순서: 입력 규칙 → 시도 제한 → 가입 코드 → 아이디 중복 → 닉네임 중복. 가입 코드가 틀린 사람은 아이디 존재 여부를 알 수 없습니다.

### `POST /api/auth/logout` — 로그아웃

본문 `{}`. 세션을 지웁니다. 항상 `00`.

### `GET /api/auth/invite/check?code={code}` — 초대 링크 미리보기 (로그인 불필요)

| 쿼리 | 설명 |
|---|---|
| `code` | 초대 코드, 1~32자 |

성공 `00`

```json
{ "teamId": 1, "teamName": "주말 맛집 원정대" }
```

> `teamId` 가 여기서만 **숫자**입니다. → [알려진 불일치](#알려진-불일치)

실패: `21`, `23`, `99`

---

## 4. 모임 (teams)

### 모임 객체

```json
{
  "id": "1",
  "name": "주말 맛집 원정대",
  "inviteCode": "team1_a1b2c3",
  "allApprovedCount": 2,
  "pinCount": 14,
  "memberCount": 3,
  "members": [
    {
      "id": "minji01",
      "nickname": "민지",
      "color": "#6C63FF",
      "avatarColor": "#6C63FF",
      "initials": "민",
      "role": "owner",
      "online": true
    }
  ]
}
```

| 필드 | 설명 |
|---|---|
| `inviteCode` | 현재 유효한(회수·만료되지 않은) 초대 코드. 없으면 `null` |
| `allApprovedCount` | 모두 인정 상태인 장소 수 |
| `members` | owner 먼저, 나머지는 참여 순. `id` 는 `login_id` |
| `members[].role` | `owner` / `admin` / `member` |
| `members[].online` | 최근 90초 안에 heartbeat를 보냈으면 `true` ([6. 접속 상태](#6-접속-상태-presence)) |

### `GET /api/teams` — 내 모임 목록

성공 `00` — 모임 객체 배열 (최근 생성 순). 참여한 모임이 없으면 `[]`.

### `GET /api/teams/{teamId}` — 모임 단건

성공 `00` — 모임 객체. 없거나 참여하지 않은 모임이면 `91`.

### `POST /api/teams` — 모임 생성

| 본문 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `name` | string | ✔ | 1~50자 |

성공 `00` — 만든 모임 객체. 만든 사람이 `owner`, 초대 코드 1개가 함께 발급됩니다(유효기간 7일).

실패: `90`, `99`

### `POST /api/teams/join` — 초대 코드로 참여

| 본문 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `code` | string | ✔ | 1~32자 |

성공 `00` — 참여한 모임 객체. 이미 멤버면 아무것도 바꾸지 않고 모임 객체를 돌려줍니다.

- 새로 참여하면 겹치지 않는 멤버 색이 자동으로 배정됩니다.
- 기준 인원이 늘었으므로 이 모임의 모든 장소의 **모두 인정을 다시 판정**합니다. ([5. 모두 인정 규칙](#모두-인정-규칙))

실패: `21`, `23`, `99`

---

## 5. 장소 (pins)

> API 이름은 `pins`, DB 테이블은 `places` 입니다.

### 장소 객체

```json
{
  "id": "101",
  "teamId": "1",
  "name": "연남동 칼국수집",
  "category": "food",
  "address": "서울 마포구 연남동 000-0",
  "roadAddress": "서울 마포구 ○○로 12",
  "lat": 37.5622,
  "lng": 126.9235,
  "addedBy": "minji01",
  "recommenders": ["minji01", "junho_k"],
  "visitedBy": ["junho_k"],
  "memo": "면이 쫄깃하고 겉절이가 맛있어요",
  "isAllApproved": true,
  "consensusAchievedAt": "2026-10-23T12:48:05Z",
  "consensusMemberCount": 3,
  "createdAt": "2026-10-21T11:14:33Z"
}
```

| 필드 | 설명 |
|---|---|
| `addedBy` | 처음 등록한 사람 `login_id` |
| `recommenders` | 추천한 사람 `login_id` (추천 순). **떠난 멤버 포함** |
| `visitedBy` | 가본 곳으로 체크한 사람 `login_id` (체크 순) |
| `memo` | **등록자**의 한 줄 평. 다른 추천인의 한 줄 평은 아직 내려주지 않음 |
| `isAllApproved` | 지금 모두 인정 상태인지 |
| `consensusAchievedAt` | 모두 인정 달성 시각 (ISO-8601, UTC). 해제되면 `null` |
| `consensusMemberCount` | 달성 당시 인원. **배지가 해제돼도 남음** → "🏅 N명 달성" 표시에 사용 |
| 시각 필드 | ISO-8601 UTC 문자열 |

### 모두 인정 규칙

| 상황 | `isAllApproved` | `consensusAchievedAt` | `consensusMemberCount` | 화면 |
|---|---|---|---|---|
| 팀원 1명 | `false` | `null` | `null` | 판정하지 않음 |
| 3명 팀에서 3명 모두 추천 | `true` | 달성 시각 | `3` | ⭐ 모두 인정 · 3명 |
| 이후 4명으로 늘어남 | `false` | `null` | `3` (유지) | 🏅 3명 달성 |
| 4명 모두 추천 | `true` | 새 달성 시각 | `4` | ⭐ 모두 인정 · 4명 |
| 달성 중에 누가 추천 취소 | `false` | `null` | `null` | 배지 없음 |

- 판정은 **지금 팀원인 사람의 추천만** 셉니다. 떠난 멤버의 추천은 `recommenders` 에는 남지만 판정에서 빠집니다.
- 기준: 모임 `consensus_rule` 이 `all` 이면 팀원 전원, 아니면 `consensus_min_count` 명. (기준 설정 API는 아직 없음, 현재 모든 모임이 `all`)
- 팀원이 늘어 배지가 해제될 때 **달성 날짜는 지워지고 인원만 남습니다.**

### `GET /api/pins?teamId={teamId}` — 모임의 장소 목록

성공 `00` — 장소 객체 배열 (최근 등록 순). 참여하지 않은 모임이면 `91`.

### `POST /api/pins` — 장소 등록 (= 첫 추천)

| 본문 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `teamId` | number | ✔ | 참여 중인 모임 |
| `name` | string | ✔ | 1~100자 |
| `category` | string | | [카테고리](#카테고리) 7개 중 하나. 비우면 `etc` |
| `address` | string | | 200자 이하 |
| `roadAddress` | string | | 200자 이하. 비우면 `address` 로 채움 |
| `lat` | number | ✔ | -90 ~ 90 |
| `lng` | number | ✔ | -180 ~ 180 |
| `memo` | string | | 한 줄 평, 100자 이하 |
| `source` | string | | `manual`(지도에서 직접 찍음) 이면 `manual`, 그 외는 모두 `search` |

성공 `00` — 등록한 장소 객체. 등록자가 첫 추천인으로 함께 저장됩니다.

실패: `90`, `91` (참여하지 않은 모임), `99`

> 같은 장소 중복 확인(F-36)은 아직 없습니다. → [제안 API](#제안-api-미구현)

### `PATCH /api/pins/{pinId}` — 장소 수정

권한: **등록자 또는 모임 owner** (admin은 아직 권한 없음)

| 본문 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `name` | string | ✔ | 1~100자 |
| `category` | string | | 7개 중 하나, 비우면 `etc` |
| `memo` | string | | 보내면 등록자의 한 줄 평을 바꿈. `""` 이면 지움. **키를 빼면 그대로 둠** |

주소·좌표는 바꿀 수 없습니다. 성공 `00` — 수정된 장소 객체.

실패: `90`, `91`, `92`, `99`

### `DELETE /api/pins/{pinId}` — 장소 삭제

권한: 등록자 또는 모임 owner. 본문 `{}`. 추천·방문 기록도 함께 지워집니다.

성공 `00` (`data: null`). 실패: `91`, `92`, `99`

### `POST /api/pins/{pinId}/recommend` — 추천 토글

본문 `{}`. 내가 추천하지 않았으면 추천을 추가하고, 했으면 취소합니다.

성공 `00`

```json
{ "pin": { }, "deleted": false, "reachedAllApproved": true }
```

| 필드 | 설명 |
|---|---|
| `pin` | 바뀐 장소 객체. `deleted` 가 `true` 면 `null` |
| `deleted` | **마지막 추천자가 취소해서 장소가 삭제됐으면** `true` (F-38). 떠난 멤버의 추천이 남아 있으면 삭제하지 않음 |
| `reachedAllApproved` | 이번 추천으로 **처음** 모두 인정을 달성했으면 `true` → 축하 효과 표시 |

- 같은 장소의 추천 토글은 DB 행 잠금으로 하나씩 처리됩니다(동시 취소 시 장소가 남지 않게).

실패: `91`, `99`

### `POST /api/pins/{pinId}/visit` — 방문 토글

본문 `{}`. 가본 곳 ↔ 가볼 곳을 바꿉니다(개인별). 성공 `00` — 장소 객체. 실패: `91`, `99`

---

## 6. 접속 상태 (presence)

### `POST /api/presence/heartbeat` — 접속 중 알림

본문 `{}`. 로그인한 화면이 **30초마다** 보냅니다. 서버는 최근 **90초** 안에 보낸 사용자를 `online` 으로 봅니다.

성공 `00` (`data: null`)

- 서버 메모리에만 저장합니다. 재시작하면 모두 오프라인이 되고, 서버가 2대 이상이면 맞지 않습니다.

---

## 7. 길찾기 · 대중교통

외부 API 키는 백엔드 환경변수에 둡니다. 키가 없으면 해당 기능만 `99` 로 실패하고 나머지는 동작합니다.

### `GET /api/route` — 자동차·도보·자전거 경로

| 쿼리 | 필수 | 설명 |
|---|---|---|
| `originLat`, `originLng` | ✔ | 출발 좌표 |
| `destLat`, `destLng` | ✔ | 도착 좌표 |
| `mode` | | `car`(기본, 카카오 모빌리티) / `walk`(TMAP 보행자) / `bike` |

성공 `00`

```json
{ "distance": 3120, "duration": 749, "path": [[37.5622, 126.9235], [37.5625, 126.9241]], "estimated": true }
```

| 필드 | 설명 |
|---|---|
| `distance` | 미터 |
| `duration` | 초 |
| `path` | `[위도, 경도]` 배열 |
| `estimated` | `bike` 일 때만 `true`. 자전거 API가 없어 도보 경로 거리를 시속 15km로 나눈 추정값 |

실패: `90` (좌표·mode 오류), `91` (경로 없음, 도보·자전거는 너무 먼 경우 포함), `99` (키 없음·외부 API 오류)

### `GET /api/transit/arrivals` — 버스 정류장 실시간 도착 (TAGO)

| 쿼리 | 필수 | 설명 |
|---|---|---|
| `lat`, `lng` | ✔ | 정류장 근처 좌표 (도시 코드를 찾는 데 사용) |
| `nodeId` | ✔ | TAGO 정류장 ID (영숫자 1~30자) |
| `routeIds` | | 쉼표로 구분한 노선 ID, 최대 10개. 비우면 전체 |

성공 `00`

```json
{ "cityCode": "33010", "arrivals": [ { "routeId": "CJB270026500", "routeNo": "502", "seconds": 240, "minutes": 4, "stopsAway": 3 } ] }
```

`cityCode` 를 찾지 못하면 `null` 과 빈 `arrivals`. 실패: `90`, `99`

### `GET /api/transit/bus-locations` — 노선 버스 위치 (TAGO)

| 쿼리 | 필수 |
|---|---|
| `cityCode` | ✔ |
| `routeId` | ✔ |

성공 `00` — `[ { "lat": 36.6, "lng": 127.4, "vehicleNo": "충북70자1234", "nodeName": "○○정류장" } ]`. 실패: `90`, `99`

### `GET /api/transit/subway-arrivals?station={역 이름}` — 수도권 지하철 실시간 도착 (서울 열린데이터광장)

`station`: 한글·영문·숫자·괄호·점·가운뎃점, 30자 이하 (예: `총신대입구(이수)`)

성공 `00`

```json
[ { "subwayId": "1002", "direction": "내선", "destination": "성수행", "next": "시청", "seconds": 120, "message": "2분 후 (시청)", "code": 99, "express": false } ]
```

| 필드 | 설명 |
|---|---|
| `direction` | 상행·하행·내선·외선 |
| `next` | 다음 역 이름 (방향 판별용) |
| `code` | 0 진입, 1 도착, 2 출발, 3 전역출발, 4 전역진입, 5 전역도착, 99 운행중 |

실패: `90`, `99` (키가 없으면 프론트는 시간표 기준으로만 표시)

### `GET /api/holidays?year={year}` — 공휴일 (한국천문연구원 특일정보)

`year`: 2000 ~ 2100. 성공 `00` — `["2026-01-01", "2026-02-16", …]` (대체공휴일·선거일 포함, 서버에 하루 캐시). 실패: `90`, `99`

---

## 8. 기타

### `GET /api/health` — 헬스체크 (로그인 불필요)

성공 `00` — `{ "status": "UP" }`

---

## 9. 프론트에서 직접 부르는 외부 API

백엔드를 거치지 않습니다. 키는 프론트 환경변수(`frontend/.env`)에 둡니다.

| 기능 | API | 키 | 코드 |
|---|---|---|---|
| 지도 표시 | 카카오 지도 JavaScript SDK | `VITE_KAKAO_MAP_KEY` | `src/lib/kakaoMaps.js`, `MapCanvas.jsx` |
| 장소 검색 | 카카오 SDK `services.Places` (`keywordSearch`, 분류 검색) | 〃 | `src/features/map/places.js` |
| 주소 ↔ 좌표 | 카카오 SDK `services.Geocoder` | 〃 | `src/features/map/geocode.js` |
| 대중교통 경로·노선·지하철 시간표 | ODsay LAB | `VITE_ODSAY_API_KEY` | `src/features/map/transit.js` |
| 지도 앱으로 열기 | `https://map.kakao.com/link/search/{장소명}` | 없음 | `PinDetailPanel.jsx` |

- 카카오 JavaScript 키는 브라우저에 노출되는 값이 정상입니다. 방어선은 카카오 개발자 콘솔의 **도메인 제한**입니다.
- ODsay 응답은 프론트에서 캐시합니다(경로 10분 세션 저장, 노선·시간표 1일 로컬 저장).

---

## 제안 API (미구현)

> 설계 초안: [personal-map.md](personal-map.md). 팀 검토 후 확정합니다. 공통 규칙(세션, 필수 헤더, 응답 형식)은 위와 같습니다.

### 개인 핀 객체 (제안)

```json
{
  "id": "7",
  "name": "연남동 칼국수집",
  "category": "food",
  "address": "서울 마포구 연남동 000-0",
  "roadAddress": "서울 마포구 ○○로 12",
  "lat": 37.5622,
  "lng": 126.9235,
  "source": "search",
  "kakaoPlaceId": "12345678",
  "memo": "다음엔 수육도",
  "createdAt": "2026-10-27T01:00:00Z"
}
```

### 개인 지도 (F-66, F-67)

| 메서드 | 경로 | 본문 / 쿼리 | 성공 `data` | 실패 |
|---|---|---|---|---|
| GET | `/api/me/places` | | 개인 핀 배열 | |
| POST | `/api/me/places` | `name`, `category`, `address`, `roadAddress`, `lat`, `lng`, `memo`, `source`, `kakaoPlaceId` (규칙은 `POST /api/pins` 와 같음) | 개인 핀 | `90`, `31`(이미 저장한 장소, `data` 에 기존 개인 핀) |
| PATCH | `/api/me/places/{id}` | `name`, `category`, `memo` | 개인 핀 | `90`, `91` |
| DELETE | `/api/me/places/{id}` | `{}` | `null` | `91` |

- 다른 사람의 개인 핀 ID로 요청하면 `91` (존재 여부를 숨김).

### 팀으로 가져오기 (F-68)

| 메서드 | 경로 | 본문 / 쿼리 | 성공 `data` |
|---|---|---|---|
| GET | `/api/teams/{teamId}/import-candidates` | | `[ { ...개인 핀, "inTeam": true, "teamPinId": "101" } ]` — 팀에 같은 장소가 있으면 `inTeam` |
| POST | `/api/teams/{teamId}/import` | `{ "personalPlaceIds": [7, 8] }` | `{ "created": 1, "merged": 1, "pins": [ 장소 객체 ] }` |

- 같은 장소면 기존 팀 장소에 내 추천을 추가(`merged`), 없으면 새 팀 장소 등록(`created`). 개인 핀의 `memo` 가 한 줄 평이 됩니다.
- 새로 생긴 팀 장소는 다른 팀원에게 동기화 알림(`added`)을 만듭니다.

### 기존 API 변경 (F-36, F-69, F-70)

| API | 추가 | 설명 |
|---|---|---|
| `POST /api/pins` | 본문 `kakaoPlaceId` | 검색 등록이면 카카오 장소 ID. 같은 장소 판별 키 |
| 〃 | 본문 `alsoPersonal: boolean` | `true` 면 내 개인 지도에도 저장 |
| 〃 | 결과 코드 `31` DUPLICATE_PLACE | 팀에 같은 장소가 이미 있음. `data` 에 기존 장소 객체 → 화면은 "○○님이 등록한 곳이에요. 나도 추천할까요?" |
| `POST /api/pins/{pinId}/recommend` | 본문 `alsoPersonal: boolean` | 추천할 때 `true` 면 개인 지도에 저장, 취소할 때 `true` 면 개인 지도에서도 삭제 |
| `DELETE /api/pins/{pinId}` | 쿼리 `?alsoPersonal=true` | 개인 지도에서도 삭제 |

- 직접 찍은 핀(`source=manual`)은 카카오 ID가 없으므로, **이름이 비슷하고 50m 이내**인 팀 장소가 있으면 `31` 대신 확인 질문용으로 `data.candidates` 를 돌려주는 방식을 검토합니다. `[결정 필요]`

### 동기화 알림 (F-71, F-72)

#### 알림 객체 (제안)

```json
{
  "id": "55",
  "teamId": "1",
  "teamName": "주말 맛집 원정대",
  "eventType": "added",
  "actor": { "id": "junho_k", "nickname": "준호" },
  "place": { "pinId": "101", "name": "연남동 칼국수집", "category": "food", "address": "…", "roadAddress": "…", "lat": 37.5622, "lng": 126.9235, "kakaoPlaceId": "12345678" },
  "inMyMap": false,
  "status": "pending",
  "createdAt": "2026-10-27T01:00:00Z"
}
```

- `place.pinId`: 팀 장소가 삭제됐으면 `null`.
- `inMyMap`: 내 개인 지도에 같은 장소가 이미 있는지.

| 메서드 | 경로 | 본문 / 쿼리 | 성공 `data` |
|---|---|---|---|
| GET | `/api/sync-notifications` | `?status=pending`(기본) / `applied` / `dismissed` / `all`, `?teamId=` | 알림 배열 (최근 순) |
| GET | `/api/sync-notifications/count` | `?teamId=` | `{ "pending": 3 }` |
| POST | `/api/sync-notifications/{id}/apply` | `{}` | 처리한 알림. `added` → 개인 지도에 저장(이미 있으면 건너뜀), `deleted` → 개인 지도에서 삭제 |
| POST | `/api/sync-notifications/{id}/dismiss` | `{}` | 처리한 알림 |
| POST | `/api/sync-notifications/apply-all` | `{ "teamId": 1 }` | `{ "applied": 3 }` |
| POST | `/api/sync-notifications/dismiss-all` | `{ "teamId": 1 }` | `{ "dismissed": 3 }` |

- 이미 처리한 알림을 다시 처리하면 아무것도 바꾸지 않고 현재 상태를 돌려줍니다.
- 다른 사람의 알림 ID면 `91`.

### 새 결과 코드 (제안)

| 코드 | 이름 | 뜻 |
|---|---|---|
| `31` | DUPLICATE_PLACE | 같은 장소가 이미 있음. `data` 에 기존 항목 |

---

## 알려진 불일치

지금 코드 기준으로 문서와 다르거나 헷갈리기 쉬운 점입니다. 고치면 이 목록에서 지웁니다.

| # | 내용 | 영향 |
|---|---|---|
| 1 | 로그인 응답 `id` 는 `user_id`, 모임 멤버·추천인·방문자의 `id` 는 `login_id` | 프론트에서 "나"를 찾을 때 `loginId` 로 비교해야 함 (`PinDetailPanel.jsx` 가 그렇게 함) |
| 2 | `GET /api/auth/invite/check` 의 `teamId` 만 숫자, 나머지 API는 문자열 | 비교할 때 `String()` 필요 |
| 3 | DB 정의서는 팀 하위 리소스 경로를 `/teams/{teamId}/places/{placeId}` 로 제안했지만, 구현은 `/pins/{pinId}` + 서비스에서 팀 멤버 확인 | 동작상 문제없음. 경로 규칙을 통일할지 결정 필요 |
| 4 | 장소 수정·삭제 권한이 owner만. 기획(F-18)·DB 정의서는 owner·admin | admin 지정 API(F-54)가 생길 때 같이 고침 |
| 5 | 초대 코드가 `team{팀ID}_{16진수 6자리}` 형식. 기획(F-55)은 "추측하기 어려운 무작위 값" | IP당 시도 제한으로 완화 중. F-58 재발급과 함께 고침 |
| 6 | 가입 시 이메일을 비우면 `{loginId}@pinmate.io` 로 저장 | `users.email` UNIQUE 와 "탈퇴 시 NULL" 규칙과 맞지 않음. 실제 메일이 아님 |
| 7 | 추천인별 한 줄 평은 저장(`recommendations.comment`)되지만 API는 등록자 것만 내려줌 | F-17 "사람별 한 줄 평" 미완 |
