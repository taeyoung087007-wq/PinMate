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
