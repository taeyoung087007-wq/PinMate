# ⚙️ PinMate 백엔드 (Backend)

Spring Boot 4.1 (Spring MVC) + MyBatis + PostgreSQL + Flyway 기반 REST API 서버입니다.

---

## 📁 디렉토리 구조

메인 클래스를 루트 패키지에 두고, 그 아래를 **기능별 패키지**로 나눈 뒤 각 기능 안을 controller / service / dao 로 나눕니다.

```text
backend/
├── pom.xml                              # Maven 설정 (mvnw로 실행, Maven 별도 설치 불필요)
└── src/main/
    ├── java/com/pinmate/
    │   ├── PinmateApplication.java      # 메인 클래스
    │   ├── cmmn/                        # 공통
    │   │   ├── config/WebMvcConfig.java # 인터셉터 등록
    │   │   ├── controller/              # 헬스체크, 공통 예외 처리(CmmnExceptionHandler)
    │   │   └── util/                    # Response, Constants(결과 코드), ParamUtil, SessionUtil ...
    │   ├── interceptor/                 # 로그인 검사, POST 요청 형식 검사
    │   └── {auth,team,pin,place,presence}/
    │       ├── controller/XxxController.java   # 입력 검증, try/catch, Response 반환
    │       ├── service/XxxService.java            # 인터페이스
    │       ├── service/impl/XxxServiceImpl.java   # 비즈니스 로직, @Transactional
    │       └── dao/XxxDAO.java                    # SqlSessionTemplate + SQL_PATH
    └── resources/
        ├── application.yml              # 공통 설정 (DB 접속 정보는 환경변수)
        ├── application-local.yml        # 로컬 개발 설정 (기본 프로파일)
        ├── sqlmap/mappers/pinmate/<기능>/<기능>.xml   # MyBatis SQL (namespace = DAO 클래스 이름)
        └── db/
            ├── migration/               # Flyway 스키마 마이그레이션 (모든 환경)
            └── seed/                    # 개발용 시드 데이터 (local 프로파일에서만 적용)
```

### 작성 규칙

- **요청**: `@RequestBody HashMap<String, Object> param` 으로 받고 `ParamUtil.str / raw / lng / dbl` 로 꺼냅니다. 검증 실패는 `Response.invalid("문구")`(code `90`).
- **응답**: 모두 `Response` — `{"code": "00", "message": null, "data": ...}`. 결과 코드는 `Constants` 에 있고, 프론트 `src/lib/apiClient.js` 의 `CODE` 와 값을 맞춥니다.
- **예외**: 컨트롤러 메서드마다 `try/catch` 로 `Response.of(Constants.FAIL, "문구", null)` 을 돌려줍니다. 트랜잭션은 서비스(`@Transactional`)에 있으므로 컨트롤러에서 잡아도 롤백됩니다. 컨트롤러 진입 전 예외(본문 형식 오류, 없는 경로 등)는 `CmmnExceptionHandler` 가 처리합니다.
- **조회 결과**: `resultType="java.util.HashMap"` 이라 키는 컬럼명 그대로(`team_id`)입니다. 화면에 넘길 때 서비스에서 camelCase 키로 바꿉니다.
- **로그인 사용자**: 요청 값이 아니라 `SessionUtil.getUserId(session)` 으로 가져옵니다. `/api/**` 는 `/api/auth/**`, `/api/health` 를 빼고 로그인이 필요하며, 세션이 없으면 401 + `{"sessionExpired": true}` 입니다.
- **POST·PATCH·DELETE**: `X-Requested-With: XMLHttpRequest` 헤더와 JSON 본문이 있어야 합니다 (다른 사이트의 폼 전송 차단).

### 로그인 · 가입

| 엔드포인트 | 결과 코드 |
| :--- | :--- |
| `POST /api/auth/signup` | `00` 가입 완료(로그인되지 않음) · `11` 가입 코드 불일치 · `12` 아이디 중복 · `13` 시도 제한 · `14` 닉네임 중복 · `90` 입력 오류 |
| `POST /api/auth/login` | `00` 성공(data: 사용자·기본 모임) · `01` 아이디 또는 비밀번호 불일치 · `03` 시도 제한 |
| `POST /api/auth/logout` | `00` |
| `GET /api/auth/invite/check?code=` | 팀 초대 링크 미리보기. `00`(data: teamId, teamName) · `21` 코드 불일치·만료 · `23` 시도 제한 |

- 가입에는 **서비스 가입 코드**(환경변수 `PINMATE_SIGNUP_CODE`)가 필요합니다. 비어 있으면 아무도 가입할 수 없습니다. 팀 초대 코드와는 별개입니다.
- 가입은 계정만 만듭니다. 팀 초대 링크(`/login?invite=코드`)로 들어온 사람은 가입 → 로그인 후 참여 확인 화면에서 팀에 들어갑니다 (`POST /api/teams/join`).
- 로그인은 아이디+IP, 가입 코드는 IP, 팀 초대 코드(미리보기·참여)는 IP 기준으로 5회 실패하면 5분 동안 막습니다 (`LoginAttemptLimiter`, 서버 메모리).
- 비밀번호는 BCrypt 로 저장합니다(최대 72바이트). 예전 SHA-256 해시 계정은 로그인에 성공하는 순간 BCrypt 로 다시 저장됩니다.
- 팀 하위 API(핀 목록·등록·추천·방문, 팀 조회)는 요청자가 그 팀 멤버인지 확인하고, 아니면 `91`(없음)로 응답합니다.
- 팀 초대 코드는 팀을 만들 때 발급되고 7일 뒤 만료됩니다.

---

## 🚀 로컬 실행

Supabase 클라우드 PostgreSQL을 사용하므로 별도의 로컬 Docker DB 실행이 필요 없습니다.

```bash
# 1. backend 폴더로 이동 후 환경변수 복사 및 비밀번호 설정 (최초 1회)
cd backend
cp .env.example .env    # .env 파일에 DB_PASSWORD=<Supabase DB 비밀번호> 입력

# 2. 서버 실행 (포트 8080, local 프로파일)
./mvnw spring-boot:run  # Windows CMD/PowerShell: mvnw.cmd spring-boot:run

# 3. 확인
curl http://localhost:8080/api/health
```

- 서버가 시작될 때 Flyway가 Supabase의 마이그레이션 적용 상태를 자동 검증합니다.

---

## 🗄️ 스키마 변경 규칙 (Flyway)

1. 파일 이름: `V<번호>__<설명>.sql` (예: `V1__create_users.sql`, 밑줄 2개)
2. **이미 커밋된 `V*.sql` 파일은 절대 수정하지 않습니다.** 수정하면 다른 팀원의 DB에서 체크섬 오류가 납니다. 변경은 새 번호의 파일로 추가합니다.
3. 버전 번호가 겹치지 않도록 새 마이그레이션을 만들기 전에 최신 main을 받습니다.
4. 시드 데이터는 `db/seed/R__dev_seed.sql`처럼 Repeatable(`R__`)로 만들고 `ON CONFLICT DO NOTHING`을 붙입니다. 파일이 바뀌면 다시 실행되기 때문입니다.

> 참고: 이전 프로토타입의 테이블 설계(`schema.sql`)는 git 이력(커밋 `cc392cd`)에 남아 있습니다.

---

## 🔎 장소 검색 API

| 엔드포인트 | 용도 |
| :--- | :--- |
| `GET /api/places/search?query=대림창고` | 상호명·주소로 검색 (장소 추가 모달의 검색창) |
| `GET /api/places/nearby?lat&lng&tapMeters&area&building&road&roadNumber` | 지도에서 누른 좌표 주변의 상가 1곳 |

두 엔드포인트 모두 **NAVER API HUB 지역 검색**(`naverapihub.apigw.ntruss.com`)을 서버에서 대신 호출합니다.
Client Secret이 필요한 API라 브라우저에서 직접 부르면 키가 노출되고 CORS로도 막히기 때문입니다.

`/nearby`는 지도 클릭 한 번에 브라우저가 역지오코딩 5회 + 검색 12회를 쏘던 것을 서버로 모은 것입니다.

- 프론트는 역지오코딩(지도 SDK, Client ID만 필요) 1회로 주소 조각을 얻어 넘깁니다
- 서버는 `건물명 → 도로명+업종(맛집·카페·술집)` 순으로 **하나씩** 시도하고, 맞으면 즉시 멈춥니다 (최대 4회)
- 클릭 지점에서 `tapMeters` 안에 있는 후보만 인정하고, 건물명 일치 > 주소 일치 > 최근접 순으로 고릅니다
- 같은 자리를 다시 누르면 10분간 캐시된 결과를 씁니다
- 못 찾으면 `data: null`을 돌려주고, 프론트는 주소만 표시합니다

**필요한 환경변수** (NCP 콘솔 > NAVER API HUB > Application > 지역 검색)

```bash
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
```

값이 없으면 두 엔드포인트 모두 503을 돌려주고, 프론트는 주소 검색(지도 SDK 지오코딩)만 사용합니다.

---

## 🌐 배포 환경 설정

`local` 이외의 환경은 환경변수로 설정합니다. 비밀값을 Git에 커밋하지 않습니다.

| 환경변수 | 예시 |
| :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | `jdbc:postgresql://<host>:5432/pinmate` |
| `DB_USERNAME` / `DB_PASSWORD` | 운영 DB 계정 |

운영 프로파일에서는 `db/seed`가 로드되지 않으므로 시드 데이터가 운영 DB에 들어가지 않습니다.
