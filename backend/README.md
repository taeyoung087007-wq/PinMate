# ⚙️ PinMate 백엔드 (Backend)

Spring Boot 4.1 (Spring MVC) + MyBatis + PostgreSQL + Flyway 기반 REST API 서버의 기본 골격입니다.
현재 API는 헬스체크(`GET /api/health`)뿐입니다.

---

## 📁 디렉토리 구조

[Spring Boot 공식 문서의 권장 구조](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)처럼 메인 클래스를 루트 패키지에 두고, 그 아래를 **기능(도메인)별 패키지**로 나눕니다.

```text
backend/
├── pom.xml                         # Maven 설정 (mvnw로 실행, Maven 별도 설치 불필요)
└── src/main/
    ├── java/com/pinmate/
    │   ├── PinmateApplication.java # 메인 클래스 (루트 패키지 = 컴포넌트 스캔 범위)
    │   └── common/                 # 공통 응답 형식(ApiResponse), 예외 처리, 헬스체크
    └── resources/
        ├── application.yml         # 공통 설정 (DB 접속 정보는 환경변수)
        ├── application-local.yml   # 로컬 개발 설정 (기본 프로파일)
        ├── mapper/                 # MyBatis SQL XML
        └── db/
            ├── migration/          # Flyway 스키마 마이그레이션 (모든 환경)
            └── seed/               # 개발용 시드 데이터 (local 프로파일에서만 적용)
```

### 기능 추가 방법 (예: 팀)

```text
java/com/pinmate/team/
├── TeamController.java    # @RestController, 요청/응답만 담당
├── TeamService.java       # 비즈니스 로직, @Transactional
├── TeamMapper.java        # @Mapper 인터페이스
└── Team.java              # 조회 결과 / 요청 DTO
resources/mapper/TeamMapper.xml   # namespace="com.pinmate.team.TeamMapper"
resources/db/migration/V1__create_team.sql
```

- 한 기능의 코드는 한 패키지에 모읍니다. 세 명이 기능을 나눠 맡으면 같은 파일을 동시에 고칠 일이 줄어듭니다.
- 응답은 `ApiResponse.ok(data)`로 감쌉니다. 실패는 `ResponseStatusException`을 던지면 `ApiExceptionHandler`가 `{"success": false, "message"}`로 바꿉니다.

---

## 🚀 로컬 실행

```bash
# 1. 프로젝트 루트에서 PostgreSQL 실행 (Docker 필요, 호스트 포트 5433)
docker compose up -d

# 2. backend 폴더에서 서버 실행 (포트 8080, local 프로파일)
./mvnw spring-boot:run        # Windows CMD/PowerShell: mvnw.cmd spring-boot:run

# 3. 확인
curl http://localhost:8080/api/health
```

- 서버가 시작될 때 Flyway가 아직 적용되지 않은 마이그레이션을 자동 실행합니다.
- DB를 처음 상태로 되돌리려면: `docker compose down -v` 후 다시 `up -d`

---

## 🗄️ 스키마 변경 규칙 (Flyway)

1. 파일 이름: `V<번호>__<설명>.sql` (예: `V1__create_users.sql`, 밑줄 2개)
2. **이미 커밋된 `V*.sql` 파일은 절대 수정하지 않습니다.** 수정하면 다른 팀원의 DB에서 체크섬 오류가 납니다. 변경은 새 번호의 파일로 추가합니다.
3. 버전 번호가 겹치지 않도록 새 마이그레이션을 만들기 전에 최신 main을 받습니다.
4. 시드 데이터는 `db/seed/R__dev_seed.sql`처럼 Repeatable(`R__`)로 만들고 `ON CONFLICT DO NOTHING`을 붙입니다. 파일이 바뀌면 다시 실행되기 때문입니다.

> 참고: 이전 프로토타입의 테이블 설계(`schema.sql`)는 git 이력(커밋 `cc392cd`)에 남아 있습니다.

---

## 🌐 배포 환경 설정

`local` 이외의 환경은 환경변수로 설정합니다. 비밀값을 Git에 커밋하지 않습니다.

| 환경변수 | 예시 |
| :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | `jdbc:postgresql://<host>:5432/pinmate` |
| `DB_USERNAME` / `DB_PASSWORD` | 운영 DB 계정 |

운영 프로파일에서는 `db/seed`가 로드되지 않으므로 시드 데이터가 운영 DB에 들어가지 않습니다.
