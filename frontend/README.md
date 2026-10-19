# 🎨 PinMate 프론트엔드 (Frontend)

React 19 + Vite 기반 클라이언트입니다. 스타일은 CSS Modules를 사용합니다.
현재 화면은 UI 확정 전 **프로토타입**입니다.

---

## 📁 디렉토리 구조

[bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)의 기능(feature) 기반 구조를 따릅니다.

```text
src/
├── main.jsx                 # 엔트리 포인트 (BrowserRouter)
├── index.css                # 글로벌 스타일 · 디자인 토큰
├── app/
│   └── App.jsx              # 라우팅: /login, /teams, /teams/:teamId
├── features/                # 기능별 모듈 (대부분의 코드는 여기)
│   ├── auth/
│   │   └── pages/           # AuthPage (로그인)
│   ├── teams/
│   │   ├── api.js           # 팀 목록 조회, 팀 생성
│   │   ├── components/      # TeamCreateModal
│   │   └── pages/           # TeamsPage
│   └── map/
│       ├── api.js           # 팀 정보, 핀 조회·등록·추천·방문
│       ├── categories.js    # 카테고리 메타데이터
│       ├── components/      # MapCanvas, PinDetailPanel, PlaceListPanel, AddPinModal, CelebrationModal
│       └── pages/           # MapPage
├── components/              # 여러 기능에서 함께 쓰는 공용 UI (현재 비어 있음)
└── lib/
    ├── apiClient.js         # fetch 래퍼 (공통 응답 형식 처리, 실패 시 에러)
    ├── naverMaps.js         # NAVER 지도 SDK 로더 (ncpKeyId로 1회만 로드)
    └── currentUser.js       # 현재 사용자 (로그인 구현 전 임시 고정값)
```

### 규칙

1. **새 기능은 `features/<기능>/` 아래에 만듭니다.** 필요한 하위 폴더(`api.js`, `components/`, `pages/`, `hooks/` 등)만 만듭니다.
2. **import 방향은 한쪽으로만 흐릅니다: 공용(`components`, `lib`) → `features` → `app`**
   - `features`끼리는 서로 import하지 않습니다. 두 기능이 같은 것을 쓰게 되면 공용 폴더로 옮깁니다.
   - 공용 폴더는 `features`나 `app`을 import하지 않습니다.
3. **페이지는 라우터를 직접 쓰지 않습니다.** 이동이 필요하면 `app/App.jsx`가 props(`onBack`, `onSelectTeam` 등)로 전달합니다.
4. **API 호출은 각 기능의 `api.js`에 둡니다.** 공통 처리는 `lib/apiClient.js`의 `request`/`post`를 씁니다.
5. **`index.js` 배럴 파일은 만들지 않고 파일을 직접 import합니다.** 배럴 파일은 Vite의 트리 셰이킹과 개발 서버 성능에 불리합니다.

---

## 🗺️ 지도 (NAVER Maps)

지도는 `features/map/components/MapCanvas.jsx` 하나만 SDK를 압니다. 페이지·패널은 `pins / members / onSelectPin / selectedPin` props만 주고받으므로, 지도 엔진을 바꿔도 다른 파일은 건드리지 않습니다.

### 키 설정

1. [NCP 콘솔](https://console.ncloud.com/maps/application) → **All Services > Application Services > Maps** 에서 이용 신청
2. **Application 등록** → API에서 **Dynamic Map** 선택, **Web 서비스 URL**에 `http://localhost:5173` 입력 (Dynamic Map은 URL이 필수)
3. **인증 정보**에서 **Client ID** 복사 (`Client Secret`은 서버용이므로 프론트에 넣지 않습니다)
4. `frontend/.env` 에 `VITE_NAVER_MAP_KEY=<Client ID>` 로 붙여넣고 개발 서버 재시작

> 무료 이용량은 NCP **대표 계정**에만 제공됩니다. Application 수정 화면에서 Dynamic Map이 선택돼 있지 않으면 429(Quota Exceed)가 납니다.

### 동작 방식

- `lib/naverMaps.js`가 `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...` 를 **필요할 때 한 번만** 동적으로 로드합니다. (index.html에 스크립트를 박지 않아, 키가 없어도 앱이 죽지 않습니다)
- 지도 생성·이동·줌은 SDK에 맡기고, 이 컴포넌트는 마커만 그립니다.
- 마커 아이콘은 DOM 요소로 만듭니다. 장소명이 사용자 입력이라 HTML 문자열 조립 시 이스케이프 문제가 생기기 때문입니다.
- 핀이 처음 들어오면 `fitBounds`로 전체가 보이게 맞추고(1회), 이후 목록에서 고른 핀이 화면 밖이면 `panTo`로 이동합니다.
- 로고(좌하단)·데이터 출처(우하단) 컨트롤은 약관상 유지합니다. 그래서 좌하단 통계 오버레이는 그 위(`bottom: 60px`)에 둡니다.

### 상태별 화면

| 상태 | 화면 |
| :--- | :--- |
| 키 없음 | 발급 절차 안내 카드 (앱은 정상 동작) |
| 인증 실패 | 도메인·Client ID 확인 안내 |
| 핀 0개 | 서울시청 중심 + "장소를 추가해 보세요" 안내 |
| 핀 1개 이상 | 핀 전체가 보이도록 자동 맞춤 |

---

## 🚀 개발 서버 실행 및 빌드

```bash
npm install
npm run dev       # http://localhost:5173 (/api 요청은 localhost:8080으로 프록시)
npm run build     # 프로덕션 빌드
npm run lint      # oxlint
```

- 백엔드 실행 방법은 [backend/README.md](../backend/README.md)를 참고하세요.
- 배포 시 API 주소가 다르면 `VITE_API_URL`을 지정합니다.
- 배포 시 웹 서버는 모든 경로를 `index.html`로 돌려줘야 합니다(SPA fallback). 그래야 `/teams/...`에서 새로고침해도 404가 나지 않습니다.
