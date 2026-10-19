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
│   │   ├── components/   # UI 컴포넌트 (지도 캔버스, 핀 상세, 축하 모달 등)
│   │   ├── pages/        # 페이지 (AuthPage, TeamsPage, MapPage)
│   │   ├── services/     # 데이터 저장소(storage.js) & API 통신(api.js)
│   │   └── data/         # Mock 데이터 및 카테고리 메타데이터
│   └── README.md         # 프론트엔드 상세 가이드
├── backend/              # 백엔드 (REST API 스켈레톤 & PostgreSQL DDL)
│   ├── server.js         # 즉시 실행 가능한 Mock REST API 서버
│   ├── schema.sql        # PostgreSQL 테이블 정의서
│   ├── package.json      # 백엔드 실행 스크립트
│   └── README.md         # 백엔드 API 명세 및 DB 가이드
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
| **지도 엔진** | HTML5 Canvas 2D | 네이버 지도 API 연동 전 자체 가상 지도 렌더러 |
| **백엔드** | Node.js (Express 호환) / Spring Boot | 현재 무설치 경량 API 서버 제공, Spring Boot 호환 |
| **데이터베이스** | PostgreSQL | 관계형 데이터 모델 및 지리정보 확장(PostGIS 준비) |

---

## 4. 빠른 실행 방법

### 프론트엔드 실행
```bash
cd frontend
npm install   # 의존성 패키지 설치
npm run dev   # 개발 서버 실행 (기본 포트: http://localhost:5173)
```

### 백엔드 Mock API 서버 실행 (선택 사항)
```bash
cd backend
npm start     # 별도 설치 없이 node server.js로 실행 (포트: 4000)
```
> **안내**: 백엔드 서버를 켜지 않아도 프론트엔드의 `LocalStorage` 기반 데이터 영속성 엔진이 자동으로 동작하여 장소 추가, 추천, 팀 생성 등이 모두 브라우저에 실시간 유지됩니다.

---

## 5. 개발자 3인 협업 가이드

개발자 3명이 효율적으로 역할을 나누어 진행할 수 있도록 권장하는 분담 체계입니다:

### 👤 개발자 A (프론트엔드 UI & 인터랙션 리드)
- 화면 UI 컴포넌트 개선 및 애니메이션 고도화
- 네이버 지도 JavaScript API 연동 (`MapCanvas.jsx` -> 실제 Naver Map View 연동)
- 모바일 반응형 뷰포트 및 터치 인터랙션 최적화

### 👤 개발자 B (백엔드 API & 데이터베이스 리드)
- PostgreSQL 데이터베이스 구축 (`schema.sql` 기반 테이블 생성)
- Spring Boot 또는 Express 기반 CRUD REST API 개발
- 인증/인가 (JWT 토큰 기반 로그인 및 사용자 세션 처리)

### 👤 개발자 C (실시간 통신 & 장소 검색/외부 API 연동)
- WebSocket (STOMP 또는 Socket.io) 기반 실시간 이벤트 처리
  - 다른 팀원이 장소를 추가하거나 추천했을 때 접속 중인 화면에 실시간 반영
  - '모두 인정' 달성 순간 모든 팀원 화면에 축하 팡파레 브로드캐스트
- 네이버 클라우드 플랫폼 장소 검색 API (NAVER Search API) 연동

---

## 6. 핵심 기능 및 기획서 매핑

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
