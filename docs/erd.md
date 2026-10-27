# PinMate ERD

> 기준: `backend/src/main/resources/db/migration/V1__init_schema.sql` (2026-10-27). 컬럼 설명은 Drive `02.설계/PinMate_DB 정의서`에 있습니다.
> GitHub에서 이 파일을 열면 다이어그램이 그림으로 보입니다.

## 1. 현재 스키마

```mermaid
erDiagram
    users ||--o{ team_members : "참여"
    teams ||--o{ team_members : "멤버"
    teams ||--o{ team_invites : "초대 링크"
    users ||--o{ team_invites : "발급"
    teams ||--o{ places : "장소"
    users ||--o{ places : "최초 등록"
    places ||--o{ recommendations : "추천"
    users ||--o{ recommendations : "추천함"
    places ||--o{ place_visits : "방문"
    users ||--o{ place_visits : "다녀옴"
    users |o--o{ event_logs : "행동"

    users {
        bigint user_id PK
        varchar login_id UK "NULL 허용, 탈퇴 시 NULL"
        varchar email UK "NULL 허용"
        varchar password_hash "BCrypt"
        varchar nickname UK "NULL 허용"
        varchar status "active / withdrawn"
        timestamptz terms_agreed_at
        timestamptz privacy_agreed_at
        timestamptz created_at
        timestamptz withdrawn_at
    }
    teams {
        bigint team_id PK
        varchar name
        varchar consensus_rule "all / majority / min_count"
        int consensus_min_count ">= 2"
        timestamptz created_at
        timestamptz updated_at
    }
    team_members {
        bigint team_id PK, FK "팀 삭제 시 CASCADE"
        bigint user_id PK, FK
        varchar role "owner / admin / member, 팀당 owner 1명"
        varchar color "팀 안에서 UNIQUE"
        timestamptz joined_at
        timestamptz places_checked_at
        timestamptz consensus_checked_at
    }
    team_invites {
        bigint invite_id PK
        bigint team_id FK "CASCADE"
        varchar code UK
        bigint created_by FK
        timestamptz expires_at "NULL = 무제한"
        timestamptz revoked_at "팀당 유효 링크 1개"
        timestamptz created_at
    }
    places {
        bigint place_id PK
        bigint team_id FK "CASCADE"
        varchar name
        varchar category "CHECK 7종"
        varchar road_address
        varchar address
        numeric latitude
        numeric longitude
        varchar source "search / manual"
        varchar source_link "현재 미사용"
        bigint created_by FK
        timestamptz consensus_achieved_at "모두 인정 중이면 값"
        int consensus_member_count "달성 당시 인원, 해제돼도 유지"
        timestamptz created_at
        timestamptz updated_at
    }
    recommendations {
        bigint place_id PK, FK "장소 삭제 시 CASCADE"
        bigint user_id PK, FK "1인 1회"
        varchar comment "한 줄 평"
        timestamptz created_at
        timestamptz updated_at
    }
    place_visits {
        bigint place_id PK, FK "CASCADE"
        bigint user_id PK, FK
        timestamptz visited_at
    }
    event_logs {
        bigint log_id PK
        varchar event_type
        bigint user_id FK "NULL 허용"
        bigint team_id "FK 없음, 팀 삭제 후에도 유지"
        bigint place_id "FK 없음"
        jsonb properties
        timestamptz created_at
    }
```

### 관계에서 눈여겨볼 점

| 관계 | 설명 |
|---|---|
| `teams` → `team_members`, `team_invites`, `places` | 팀을 지우면 함께 지워짐 (`ON DELETE CASCADE`) |
| `places` → `recommendations`, `place_visits` | 장소를 지우면 함께 지워짐. 마지막 추천 취소 시 장소 삭제(F-38) |
| `team_members` 행 삭제 | 팀 탈퇴·내보내기. `recommendations`·`place_visits` 는 남음('떠난 멤버') |
| `users` | 탈퇴해도 행을 지우지 않고 `status = withdrawn` (FK가 깨지지 않게) |
| `event_logs` | `team_id`·`place_id` 에 FK가 없음. 대상이 지워져도 로그는 남김 (현재 기록 코드 없음) |

## 2. 제안 반영 후 (개인 지도 · 동기화 알림 · 같은 장소 판별)

> **상태: 제안 — 미구현.** 설계 설명: [personal-map.md](personal-map.md). 아래 그림은 바뀌거나 새로 생기는 부분과 그 이웃만 그립니다.

```mermaid
erDiagram
    users ||--o{ personal_places : "개인 핀 (신규)"
    users ||--o{ sync_notifications : "받는 사람 (신규)"
    users ||--o{ sync_notifications : "변경한 팀원 (신규)"
    teams ||--o{ sync_notifications : "팀 (신규, CASCADE)"
    teams ||--o{ places : "장소"
    places |o..o{ sync_notifications : "place_id, FK 없음"
    places }o..o{ personal_places : "kakao_place_id 로 같은 장소 판별"

    personal_places {
        bigint personal_place_id PK
        bigint user_id FK
        varchar name
        varchar category "CHECK 7종"
        varchar road_address
        varchar address
        numeric latitude
        numeric longitude
        varchar source "search / manual"
        varchar kakao_place_id "UNIQUE (user_id, kakao_place_id)"
        varchar memo
        timestamptz created_at
        timestamptz updated_at
    }
    places {
        bigint place_id PK
        bigint team_id FK
        varchar kakao_place_id "신규, UNIQUE (team_id, kakao_place_id)"
        varchar source_link "삭제 검토"
    }
    sync_notifications {
        bigint notification_id PK
        bigint user_id FK "받는 사람"
        bigint team_id FK "CASCADE"
        bigint place_id "FK 없음"
        varchar event_type "added / deleted"
        bigint actor_user_id FK
        varchar name "장소 정보 복사본"
        varchar category
        varchar road_address
        varchar address
        numeric latitude
        numeric longitude
        varchar kakao_place_id
        varchar status "pending / applied / dismissed"
        timestamptz created_at
        timestamptz resolved_at
    }
```

| 변경 | 이유 |
|---|---|
| `personal_places` 신규 | 개인 지도(F-66, F-67). 팀 장소(`places`)와 섞지 않아야 추천·모두 인정 규칙이 개인 핀에 걸리지 않음 |
| `places.kakao_place_id` 추가 | 같은 장소 판별(F-36)과 개인 핀 ↔ 팀 장소 연결(F-68 ~ F-72) 공용 키. 부분 UNIQUE로 동시 등록 중복도 DB에서 막음 |
| `sync_notifications` 신규 | 동기화 알림 탭(F-71, F-72). 받는 사람마다 한 행이라 사람별 반영·무시 상태를 따로 가짐 |
| `sync_notifications.place_id` FK 없음 | 팀 장소가 삭제된 뒤에도 '삭제됨' 알림을 보여 줘야 해서. 장소 정보는 행에 복사해 둠 |
