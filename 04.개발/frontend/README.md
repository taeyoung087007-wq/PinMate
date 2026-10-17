# 🎨 PinMate 프론트엔드 (Frontend)

PinMate 웹 애플리케이션의 클라이언트 소스 코드입니다. React 18과 Vite를 기반으로 구축되었으며, Vanilla CSS(CSS Modules) 기반의 프리미엄 다크 글래스모피즘 디자인 시스템을 적용했습니다.

---

## 📁 디렉토리 구조

```text
src/
├── assets/                  # 정적 이미지 및 에셋
├── components/              # 재사용 가능한 UI 컴포넌트
│   ├── AddPinModal.jsx      # 장소 검색 및 핀 추가 모달 (직접 등록 지원)
│   ├── AddPinModal.module.css
│   ├── CelebrationModal.jsx # '모두 인정' 달성 축하 팡파레 팝업 (컨페티 효과)
│   ├── CelebrationModal.module.css
│   ├── MapCanvas.jsx        # 캔버스 2D 기반 인터랙티브 지도 (줌/패닝/마커)
│   ├── MapCanvas.module.css
│   ├── PinDetailPanel.jsx   # 장소 상세 정보 패널 (추천/방문체크/네이버지도)
│   ├── PinDetailPanel.module.css
│   ├── PlaceListPanel.jsx   # 팀 장소 사이드 목록 패널 (모두인정 그룹 우선)
│   ├── PlaceListPanel.module.css
│   ├── TeamCreateModal.jsx  # 팀 생성 및 초대 링크/QR 안내 모달
│   └── TeamCreateModal.module.css
├── data/
│   └── mockData.js          # 초기 목업 데이터 (사용자, 팀, 핀, 카테고리)
├── pages/
│   ├── AuthPage.jsx         # 로그인 & 회원가입 화면
│   ├── AuthPage.module.css
│   ├── TeamsPage.jsx        # 내 팀 목록 및 팀 관리 화면
│   ├── TeamsPage.module.css
│   ├── MapPage.jsx          # 메인 팀 장소 공유 지도 화면
│   └── MapPage.module.css
├── services/
│   ├── storage.js           # LocalStorage 기반 데이터 영속성 관리
│   └── api.js               # REST API 연동 및 자동 오프라인 폴백 레이어
├── App.jsx                  # 루트 앱 라우팅 및 세션 상태 관리
├── App.css
├── index.css                # 글로벌 디자인 토큰 (색상, 글래스모피즘, 폰트)
└── main.jsx                 # 엔트리 포인트
```

---

## 🚀 개발 서버 실행 및 빌드

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 기동 (HMR 지원)
npm run dev

# 3. 프로덕션 빌드
npm run build

# 4. 빌드 결과물 미리보기
npm run preview
```

---

## 🎯 주요 컴포넌트 및 인터랙션 안내

1. **`MapCanvas.jsx` (지도 엔진)**
   - HTML5 2D Canvas를 이용하여 서울 중심의 가상 지도망과 한강 지형을 렌더링합니다.
   - 마우스 드래그로 지도 이동(패닝), 휠 스크롤 또는 우측 하단 컨트롤러(+ / -)로 부드러운 줌을 지원합니다.
   - 핀 마커는 카테고리별 테마 색상 및 이모지로 표시되며, 2명 이상 추천 시 추천 수 뱃지가 부착됩니다.
   - **팀원 전원이 추천한 핀은 황금빛 골드 글로우(Gold Glow)와 특별 마커**로 빛납니다.

2. **`CelebrationModal.jsx` (모두 인정 달성 축하)**
   - 팀원 전원이 추천을 완료하는 순간 파티클(컨페티) 효과와 황금 별 애니메이션이 화면 중앙에 펼쳐집니다.
   - 기획서(F-41)의 "차별화 핵심 기능"을 완벽하게 시각화했습니다.

3. **`AddPinModal.jsx` (장소 추가)**
   - 대표 추천 장소 리스트 검색을 지원하며, 목록에 없는 장소도 사용자가 타이핑한 장소명으로 즉시 직접 핀을 꽂을 수 있습니다.
   - 맛집, 카페, 술집, 숙소, 명소, 놀거리, 기타 카테고리를 선택하고 한 줄 메모를 남길 수 있습니다.

4. **`PinDetailPanel.jsx` (장소 상세 패널)**
   - 핀을 클릭하면 화면 하단에서 부드럽게 올라옵니다.
   - 어떤 팀원이 추천했는지 아바타로 한눈에 확인 가능하며, '나도 추천하기'를 누르면 내 추천이 실시간 반영됩니다.
   - 방문 여부('다녀왔어요') 체크 토글 및 네이버 지도 새 탭 바로가기를 지원합니다.

---

## 🎨 디자인 시스템 토큰 (`src/index.css`)

- **Primary Accent**: `#6C63FF` (인디고 바이올렛)
- **Gold Accent (모두 인정)**: `#FFBA08` (선명한 골드 옐로우)
- **Background Base**: `#0E0F1A` (깊이감 있는 다크 톤)
- **Glass Card**: `backdrop-filter: blur(16px)` + 1px 은은한 반투명 테두리
- **Typography**: Pretendard, Inter, 시스템 폰트 체계
