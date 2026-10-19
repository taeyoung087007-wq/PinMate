# ⚙️ PinMate 백엔드 (Backend)

PinMate 서비스의 데이터 모델링(PostgreSQL DDL) 및 REST API 서버 아키텍처 가이드입니다.

---

## 📁 디렉토리 구조

```text
backend/
├── schema.sql        # PostgreSQL 테이블 DDL 스크립트 (ERD 설계 반영)
├── server.js         # Zero-Dependency 초경량 Mock API 서버 (포트: 4000)
├── package.json      # 백엔드 스크립트 정의
└── README.md         # [본 문서] 백엔드 개발 및 API 명세 가이드
```

---

## 🚀 빠른 실행

별도의 npm 패키지 설치 없이 Node.js 표준 라이브러리만으로 즉시 구동됩니다:

```bash
# 서버 실행 (포트 4000)
npm start

# 코드 변경 감지 모드 (Node 18+)
npm run dev
```

서버가 실행되면 다음 엔드포인트로 즉시 통신할 수 있습니다:
- **헬스 체크**: `http://localhost:4000/api/health`
- **팀 목록**: `http://localhost:4000/api/teams`
- **핀 목록**: `http://localhost:4000/api/pins?teamId=team-1`

---

## 📡 REST API 엔드포인트 명세서

### 1. 팀 관련 API
| 메서드 | 엔드포인트 | 설명 | 요청 본문 (JSON) | 응답 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/teams` | 사용자가 소속된 팀 목록 조회 | 없음 | `{"success": true, "data": [...]}` |
| `POST` | `/api/teams` | 새 팀 생성 | `{"name": "성수 카페 투어"}` | `{"success": true, "data": { "id": "team-...", ... }}` |

### 2. 핀(장소) 관련 API
| 메서드 | 엔드포인트 | 설명 | 요청 본문 (JSON) | 응답 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pins?teamId={id}` | 특정 팀의 장소 목록 조회 | 쿼리스트링 `teamId` | `{"success": true, "data": [...]}` |
| `POST` | `/api/pins` | 팀 지도에 새 장소 등록 | `{"teamId": "...", "name": "...", "lat": 37.56, "lng": 126.97, "category": "food", "memo": "..."}` | `{"success": true, "data": { "id": "pin-...", ... }}` |
| `POST` | `/api/pins/:id/recommend` | 장소 추천 / 추천 취소 토글 | `{"userId": "user-1"}` | `{"success": true, "data": { "id": "...", "isAllApproved": true, ... }}` |

---

## 🗄️ PostgreSQL 데이터베이스 모델 (schema.sql)

백엔드 개발자들을 위해 표준 3정규화된 테이블 구조가 `schema.sql`에 정의되어 있습니다:

1. **`users`**: 사용자 계정 (이메일, 닉네임, 아바타 색상)
2. **`teams`**: 모임 정보 (팀명, 고유 초대 코드, 소유자 ID, 모두인정 기준)
3. **`team_members`**: 팀-사용자 N:M 매핑 테이블 (역할: OWNER/ADMIN/MEMBER, 팀 내 고유 색상)
4. **`places`**: 등록된 장소 핀 (팀ID, 장소명, 주소, 카테고리, 위경도 좌표, 최초등록자, 모두인정 여부)
5. **`place_recommendations`**: 1인 1회 추천 기록 (장소ID, 사용자ID, 한줄코멘트)
6. **`place_visits`**: 멤버별 실제 방문 확인 기록 (장소ID, 사용자ID, 방문일시)

### Spring Boot JPA 엔티티 구성 시 팁
- `Place` 엔티티와 `PlaceRecommendation` 엔티티는 `@OneToMany` 관계로 매핑할 수 있습니다.
- 장소에 추천이 추가될 때, 해당 팀의 활성 멤버 수와 추천인 수를 비교하여 `isAllApproved` 플래그를 업데이트하는 도메인 로직을 `PlaceService`에 작성하면 됩니다.
