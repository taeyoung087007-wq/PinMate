# PinMate 배포

준비 기준: 2026-11-06. Vercel Hobby + Render Free + 기존 Supabase PostgreSQL을 사용한다. 운영 주소는 **https://pinmate.kro.kr**이다.

이 가이드는 설정 파일과 배포 절차를 설명한다. 클라우드 프로젝트 생성·DNS 연결·운영 DB 검증은 아직 수행하지 않았다.

## 구성

브라우저 → `https://pinmate.kro.kr/api/*` → Vercel 외부 rewrite → Render `/api/*` 순서다. React 화면과 API가 브라우저에서 같은 출처이므로 기존 세션 인증을 유지한다.

| 파일 | 용도 |
| --- | --- |
| `frontend/vercel.ts` | API 프록시, SPA 새로고침 라우팅, API 캐시 금지 |
| `backend/Dockerfile` | Java 17 다단계 빌드, 일반 사용자 실행, JVM heap 최대 256MB |
| `backend/.dockerignore` | 실제 `.env`, 테스트·빌드 산출물 제외 |
| `backend/src/main/resources/application-prod.yml` | Render 포트, HTTPS 쿠키, DB 풀 3개, 자동 SQL·Flyway 비활성화 |
| `render.yaml` | 무료 Docker 웹 서비스 1개, 초기 자동 배포 off |

프론트 `VITE_API_URL`은 `/api`로 유지한다. Render URL을 직접 넣으면 현재 세션 쿠키 구조와 맞지 않는다. 서버 비밀번호·REST API 키는 `VITE_` 변수에 넣지 않는다.

## DB 담당자 확인

운영 프로필의 `spring.flyway.enabled=false`, `spring.sql.init.mode=never`를 유지한다. 배포 시 새 테이블·시드 삽입·시드 삭제를 자동 실행하지 않는다.

담당자가 기존 DB에 다음을 읽기 전용으로 확인한 뒤 연결 정보를 전달해야 한다.

```sql
SELECT version, description, success
FROM flyway_schema_history
WHERE version IS NOT NULL
ORDER BY installed_rank;
```

- 코드의 `backend/src/main/resources/db/migration`과 적용 이력이 일치하는지 확인한다. 현재 최신 버전은 V13이다.
- 누락된 마이그레이션은 담당자가 내용과 데이터 영향을 검토해 별도로 실행한다. 배포 설정에서 Flyway를 켜서 해결하지 않는다.
- 기존 Supabase Session pooler의 JDBC URL·계정·SSL 설정을 사용한다. 새 DB나 DB 이전은 필요 없다.
- `/api/health`는 애플리케이션 생존 확인이며 DB 스키마 검사 기능은 없다.

## 환경변수

실제 값은 플랫폼 환경변수 화면에서 입력한다. `.env` 파일이나 비밀번호를 Git에 올리지 않는다.

### Render

| 이름 | 값 |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` (Blueprint 기본값) |
| `SPRING_FLYWAY_ENABLED` | `false` (유지) |
| `DB_URL` | 담당자가 지정한 기존 DB의 JDBC URL, SSL 포함 |
| `DB_USERNAME`, `DB_PASSWORD` | 기존 DB 접속 계정·비밀번호 |
| `PINMATE_SIGNUP_CODE` | 서비스 가입 코드. 비어 있으면 회원가입 불가 |
| `KAKAO_REST_API_KEY` | 선택: 자동차 길찾기 |
| `TMAP_APP_KEY` | 선택: 도보 길찾기 |
| `TAGO_SERVICE_KEY` | 선택: 실시간 버스, Decoding 키 |
| `SEOUL_SUBWAY_KEY` | 선택: 서울 실시간 지하철 |

`PORT`는 Render가 제공한다(기본 10000). 선택 키는 Render 서비스의 **Environment → Add Environment Variable**에서 이름과 값을 추가한다. 실제 키를 `render.yaml`에 적지 않는다. 생략하면 해당 외부 기능만 사용할 수 없다.

### Vercel

| 이름 | Production 값 |
| --- | --- |
| `BACKEND_ORIGIN` | `https://<생성된-서비스>.onrender.com` — `/api`·쿼리·인증정보 없이 |
| `VITE_API_URL` | `/api` |
| `VITE_KAKAO_MAP_KEY` | 카카오 **JavaScript** 키 |
| `VITE_ODSAY_API_KEY` | 선택: ODsay URI 키 |
| `VITE_PUBLIC_URL` | `https://pinmate.kro.kr` |

Vercel Root Directory는 `frontend`, Framework는 Vite, Node.js는 CI와 같은 22.x, Build Command는 `npm run build`, Output Directory는 `dist`를 사용한다.

초기에는 **Production 배포만 사용하고 Vercel의 Preview 자동 배포는 꺼 둔다.** Preview에는 운영 DB로 이어지는 `BACKEND_ORIGIN`을 등록하지 않는다. 별도 테스트 백엔드 없이 Preview를 실행하면 설정 검사에서 실패한다. 나중에 격리된 테스트 백엔드의 주소를 Preview 환경에 등록한 뒤 Preview를 활성화한다. 환경변수를 바꾸면 새로 배포해야 반영된다.

## 최초 배포 순서

1. 이 설정을 PR로 검토하고 main에 반영한다. DB 담당자 확인을 마친다.
2. Render에서 저장소의 `render.yaml`을 Blueprint로 검토한다. `plan: free`, Singapore, Docker context `backend`, health path `/api/health`를 확인하고 환경변수를 입력한다. **Blueprint 생성은 첫 배포를 시작한다.**
3. 발급된 Render 주소의 `/api/health`에서 HTTP 200과 JSON `data.status=UP`을 확인한다. 운영 스키마·인증 검증 완료를 뜻하지는 않는다.
4. Vercel에 저장소를 Import하고 Root Directory `frontend`와 Production 환경변수를 설정해 배포한다. Preview 자동 배포는 비활성화한다. 기본 주소에서도 지도를 확인하려면 그 주소를 카카오 콘솔에 추가한다.
5. Vercel Domains에 `pinmate.kro.kr`을 추가한다. 기존 DNS 사용 여부를 먼저 확인한 뒤 **Vercel 화면이 제시한 레코드**를 도메인 관리 화면에 등록한다. 고정 IP를 임의로 가정하지 않는다. 도메인 검증과 HTTPS 발급 완료를 확인한다.
6. 카카오 JavaScript 허용 도메인과 ODsay 허용 URI에 `https://pinmate.kro.kr`을 등록한다. 서버 API의 허용 IP 제한이 있다면 Render의 outbound IP 범위를 확인한다.
7. 아래 브라우저 점검을 마친 뒤 공개한다.

초기 Vercel Git 연동은 main push로 Production 빌드를 시작할 수 있다. Render는 `autoDeployTrigger: 'off'`이므로 수동 배포한다. 둘을 함께 자동화하려면 최초 운영 점검 후 Render를 `checksPass`로 변경하고 GitHub CI 통과 후 배포하도록 한다. 프론트·백엔드는 따로 배포되므로 호환되는 변경을 먼저 배포한다.

## 배포 후 브라우저 확인

- `/login` 직접 접근·새로고침이 정상이며 `/api/health`는 HTML 대신 JSON을 반환한다.
- 로그인 응답에 `Secure; HttpOnly; SameSite=Lax` 세션 쿠키가 있고, 쿠키 Domain을 Render 주소로 고정하지 않는다. 이어지는 `/api` 요청과 새로고침 후에도 로그인이 유지된다.
- 로그아웃 후 보호 API는 401을 반환하고, 다른 브라우저의 데이터가 섞이지 않는다. API 응답의 `Cache-Control`은 `private, no-store`다.
- 실제 운영 도메인에서 카카오 지도·장소 검색이 동작한다. 입력한 선택 키별 길찾기·대중교통도 점검한다.
- 장소·모임·친구 조회를 확인한다. 쓰기 점검은 합의한 테스트 계정과 테스트 데이터로만 한다.
- Render 절전 후 재접속, 재시작에 따른 세션 소멸과 재로그인을 확인한다.

현재 접속 상태는 HTTP polling 방식이다. Render의 WebSocket 지원과 앱의 WebSocket 구현은 별개다. WebSocket을 추가할 때는 `wss` 경로·세션 인증·재연결을 별도 검증한다. `pinmate.kro.kr`의 host-only 쿠키는 Render 주소로 직접 연결할 때 전달되지 않으므로 인증 경로를 함께 설계해야 한다.

## 무료 운영 제한

- Vercel Hobby는 개인·비상업 사용 조건이다. 상업 서비스 전환 시 요금제를 다시 확인한다.
- Render Free는 0.1 CPU·RAM 512MB, 15분 무요청 시 절전, 재접속 시 약 1분의 기동 대기가 있다. Vercel 외부 rewrite의 제한 시간은 120초이며 실제 Render 기동 시간은 배포 후 확인한다.
- Render 무료 인스턴스 시간은 워크스페이스 전체 월 750시간이다. 현재 Hobby 포함량은 outbound 전송 월 5GB·빌드 월 500분이다. 결제수단이 있으면 추가 사용료가 발생할 수 있고, 없으면 한도 소진 시 서비스나 새 빌드가 중단될 수 있다.
- 세션과 요청 제한 카운터는 서버 메모리에 있어 재시작·절전 후 사라질 수 있다. 현재 구성은 백엔드 1개만 운영한다.
- 별도 무료 DB·디스크·워커를 만들지 않는다. 기존 Supabase의 용량·연결 수·무료 정책도 계정 화면에서 확인한다.
- 실제 생성 전에 각 계정의 무료 한도와 지출 설정을 확인한다. 절전을 피하려는 상시 ping은 구성하지 않는다.

## 롤백

프론트는 Vercel의 직전 정상 Production 배포로 되돌리고, 백엔드는 Render의 직전 정상 배포를 선택한다. 필요하면 자동 배포를 끄고 main에는 수정 PR을 반영한다.

이 설정은 DB 마이그레이션을 실행하지 않으므로 DB 되돌리기를 포함하지 않는다. 담당자가 별도로 스키마를 변경했다면 그 변경의 복구 절차도 별도로 관리한다.

## 로컬 검증 결과 (2026-11-06)

- 프론트 lint 오류 0개(기존 경고 12개), 테스트 66개, production build 통과. API 프록시 원본 검사와 캐시 비활성화 테스트 포함.
- 백엔드 테스트 116개 통과, 실제 DB가 필요한 컨텍스트 테스트 1개는 제외. Docker 이미지 빌드 통과.
- Docker의 0.1 CPU·512MB 제한, 외부 네트워크 차단, 가짜 DB 주소로 `prod` 기동 확인. 프로세스 시작부터 약 55초, 유휴 메모리 약 154MiB. `/api/health` 200, 미인증 `/api/teams` 401, Ajax 헤더 없는 로그인 요청 403 확인.
- YAML 파싱과 무료 플랜·자동 배포 off·DB 자동 변경 차단·쿠키 설정 검사 통과. 테스트 컨테이너 제거 완료.
- 위 수치는 로컬 무부하 측정이다. 실제 Render의 콜드 스타트·DB 연결·부하 메모리·Vercel 세션 쿠키 왕복·운영 지도 도메인은 미검증이다.

## 공식 문서

- [Vercel programmatic configuration](https://vercel.com/docs/project-configuration/vercel-ts)
- [Vercel rewrites](https://vercel.com/docs/rewrites)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Render Blueprint](https://render.com/docs/blueprint-spec)
- [Render Free](https://render.com/docs/free)
- [Render outbound bandwidth](https://render.com/docs/outbound-bandwidth)
- [Render build pipeline](https://render.com/docs/build-pipeline)
- [Render WebSocket](https://render.com/docs/websocket)
