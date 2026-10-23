# 📍 PinMate (핀메이트)

> **"친구들과 모임을 만들고, 각자 추천하는 장소를 하나의 지도에 모아보는 실시간 장소 공유 웹 서비스"**

---

## 📖 목차
1. [프로젝트 소개](#1-프로젝트-소개)
2. [전체 아키텍처 및 디렉토리 구조](#2-전체-아키텍처-및-디렉토리-구조)
3. [기술 스택](#3-기술-스택)
4. [빠른 실행 방법](#4-빠른-실행-방법)
5. [개발자 3인 협업 가이드](#5-개발자-3인-협업-가이드)
6. [핵심 기능 및 기획서 매핑](#6-핵심-기능-및-기획서-매핑)

---

## 1. 프로젝트 소개
- **배경**: 카카오톡 등 단체 대화방에 공유한 맛집/카페 링크는 대화에 묻혀 나중에 다시 찾기 어렵습니다.
- **해결책**:
  - 팀을 만들어 각자 추천하는 장소를 지도 위에 핀으로 시각화합니다.
  - 팀원들이 같은 장소를 추천할수록 추천 수가 쌓이며, **팀원 전원이 추천하면 '모두 인정' 골드 마커**와 화려한 팡파레 효과가 나타납니다.
  - 카테고리별(맛집, 카페, 술집, 숙소, 명소, 놀거리) 및 추천 멤버별 필터링을 지원합니다.

---

## 2. 전체 아키텍처 및 디렉토리 구조

```text
PinMate/
├── frontend/             # 프론트엔드 웹 애플리케이션 (React 19 + Vite + Vanilla CSS)
│   ├── src/
│   │   ├── app/          # 라우팅
│   │   ├── features/     # 기능별 모듈 (auth, teams, map)
│   │   ├── components/   # 공용 UI
│   │   └── lib/          # API 클라이언트 등 공용 유틸
│   └── README.md         # 프론트엔드 구조 규칙
├── backend/              # Spring Boot (Spring MVC) + MyBatis + Flyway
│   ├── src/main/java/    # com.pinmate 아래 기능별 패키지 (현재 common만 존재)
│   ├── src/main/resources/  # 설정, MyBatis XML, Flyway 마이그레이션·시드
│   └── README.md         # 백엔드 구조 규칙 및 DB 가이드
├── docker-compose.yml    # 로컬 개발용 PostgreSQL
├── .gitignore            # Git 형상관리 제외 설정
└── README.md             # [본 문서] 프로젝트 종합 가이드
```

---

## 3. 기술 스택

| 영역 | 선정 기술 | 비고 |
| :--- | :--- | :--- |
| **프론트엔드** | React 19, Vite | 고성능 SPA, HMR 지원 |
| **스타일링** | Vanilla CSS (CSS Modules) | 프리미엄 다크 글래스모피즘 디자인 시스템 |
| **아이콘** | Lucide React | 모던 벡터 아이콘 셋 |
| **지도** | NAVER Maps JavaScript API v3 | `MapCanvas`가 SDK를 감싸고 핀(마커)만 직접 그린다 |
| **백엔드** | Spring Boot 4.1 (Spring MVC), Java 17 | Maven Wrapper(`mvnw`)로 빌드·실행 |
| **DB 접근** | MyBatis | SQL은 `resources/mapper/*.xml` |
| **데이터베이스** | PostgreSQL 16 | 로컬은 Docker, 스키마는 Flyway 마이그레이션으로 관리 |

---

## 4. 빠른 실행 방법

사전 준비: JDK 17+, Node.js, Docker, NAVER 지도 Client ID

### 0) 지도 키 설정 (최초 1회, 프론트)
```bash
cd frontend
cp .env.example .env      # Windows: copy .env.example .env
# .env 파일에 VITE_NAVER_MAP_KEY=<NCP Maps Client ID> 입력
```
> Client ID는 브라우저에 노출되는 값이라 프론트 환경변수로 두는 것이 정상입니다. 방어선은 NCP 콘솔에 등록한 도메인 제한입니다. **Client Secret은 프론트에 넣지 마세요** (서버에서 호출하는 Geocoding/Directions용).
> 키가 없으면 지도 자리에 발급 안내가 표시되고, 나머지 화면은 그대로 동작합니다.

### 1) 데이터베이스 실행 (프로젝트 루트)
```bash
docker compose up -d   # PostgreSQL (localhost:5433)
```

### 2) 백엔드 실행
```bash
cd backend
./mvnw spring-boot:run   # http://localhost:8080 (Windows: mvnw.cmd spring-boot:run)
```
> 서버 시작 시 Flyway가 마이그레이션과 개발용 시드 데이터를 자동으로 적용합니다. 확인: `curl http://localhost:8080/api/health`

### 3) 프론트엔드 실행
```bash
cd frontend
npm install   # 의존성 패키지 설치
npm run dev   # http://localhost:5173 (/api 요청은 8080으로 프록시)
```

> **안내**: 데이터는 각자의 로컬 DB에 저장되고, 스키마는 Git의 마이그레이션 파일로 공유합니다.
> 현재 백엔드는 헬스체크만 있는 골격이라서, 팀·핀 API를 구현하기 전까지 프로토타입 화면에는 "API 요청 실패 (404)"가 표시됩니다.

---

## 5. 개발자 3인 협업 가이드

개발자 3명이 효율적으로 역할을 나누어 진행할 수 있도록 권장하는 분담 체계입니다:

### 👤 개발자 A (프론트엔드 UI & 인터랙션 리드)
- 화면 UI 컴포넌트 개선 및 애니메이션 고도화
- 네이버 지도 JavaScript API 연동 (`MapCanvas.jsx` -> 실제 Naver Map View 연동)
- 모바일 반응형 뷰포트 및 터치 인터랙션 최적화

### 👤 개발자 B (백엔드 API & 데이터베이스 리드)
- PostgreSQL 스키마를 Flyway 마이그레이션으로 작성 (`backend/src/main/resources/db/migration`)
- Spring Boot + MyBatis 기반 CRUD REST API 개발
- 인증/인가 (JWT 토큰 기반 로그인 및 사용자 세션 처리)

### 👤 개발자 C (실시간 통신 & 장소 검색/외부 API 연동)
- WebSocket (STOMP 또는 Socket.io) 기반 실시간 이벤트 처리
  - 다른 팀원이 장소를 추가하거나 추천했을 때 접속 중인 화면에 실시간 반영
  - '모두 인정' 달성 순간 모든 팀원 화면에 축하 팡파레 브로드캐스트
- 네이버 클라우드 플랫폼 장소 검색 API (NAVER Search API) 연동

### 🔀 브랜치 운영 규칙 — main에 직접 커밋하지 않는다

`main`은 항상 배포 가능한 상태로 둡니다. 모든 작업은 브랜치를 따서 PR로 올립니다.

```bash
git switch main && git pull
git switch -c fix/pin-detail-panel      # <타입>/<내용>
# 작업 후
git push -u origin fix/pin-detail-panel
# GitHub에서 PR 생성 → CI 통과 확인 → 머지
```

| 타입 | 용도 |
| :--- | :--- |
| `feat/` | 기능 추가 |
| `fix/` | 버그 수정 |
| `chore/` | 설정·의존성·문서 정리 |
| `refactor/` | 동작 변경 없는 구조 개선 |

**① 로컬 방어선 (각자 1회 설치)**

`main`으로 직접 push하면 아래 hook이 막아줍니다.

```bash
git config core.hooksPath .githooks
```

> `core.hooksPath`는 저장소가 아니라 **내 PC 설정**이라, 팀원 각자 한 번씩 실행해야 합니다.

**② GitHub에서 강제 (권장)**

CI만으로는 push 자체를 막을 수 없습니다. 저장소 관리자가 한 번만 설정하세요.

```
Settings → Branches → Add branch protection rule (또는 Rulesets)
  Branch name pattern: main
  ☑ Require a pull request before merging
  ☑ Require status checks to pass before merging  → CI 선택
  ☑ Do not allow bypassing the above settings
```

> 비공개 저장소는 플랜에 따라 branch protection이 제한될 수 있습니다. 그 경우 ①의 hook과 팀 규칙으로 운영하세요.

---

## 6. 핵심 기능 및 기획서 매핑

> 구현 현황은 **프론트엔드 UI 프로토타입** 기준입니다. 백엔드 API는 아직 구현되지 않았습니다.

| 기획 번호 | 기능명 | 구현 현황 | 관련 파일 |
| :--- | :--- | :---: | :--- |
| **F-51** | 팀 생성 및 초대 링크 | ✅ 구현 완료 | `TeamCreateModal.jsx`, `TeamsPage.jsx` |
| **F-56** | QR 코드 초대 안내 | ✅ 구현 완료 | `TeamCreateModal.jsx` |
| **F-37** | 나도 추천하기 (1인 1회) | ✅ 구현 완료 | `PinDetailPanel.jsx`, `storage.js` |
| **F-39** | 추천 수 마커 뱃지 표시 | ✅ 구현 완료 | `MapCanvas.jsx` |
| **F-40** | '모두 인정' 골드 마커 | ✅ 구현 완료 | `MapCanvas.jsx` |
| **F-41** | '모두 인정' 달성 축하 팡파레 | ✅ 구현 완료 | `CelebrationModal.jsx` |
| **F-43** | 모두 인정 장소 모아보기 | ✅ 구현 완료 | `MapPage.jsx` (토글 필터), `PlaceListPanel.jsx` |
| **F-53** | 팀원별 색상 및 필터 | ✅ 구현 완료 | `MapPage.jsx` (팀원 필터 칩) |
| **-** | 장소 직접 등록 / 검색 | ✅ 구현 완료 | `AddPinModal.jsx` |
| **-** | 네이버 지도 앱 바로가기 | ✅ 구현 완료 | `PinDetailPanel.jsx` |
