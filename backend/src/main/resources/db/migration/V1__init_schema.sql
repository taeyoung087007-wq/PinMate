-- ===================================================
-- PinMate (핀메이트) PostgreSQL DDL (DB 정의서 반영)
-- ===================================================

-- 1. 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login_id VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(100),
    nickname VARCHAR(30) UNIQUE,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    terms_agreed_at TIMESTAMPTZ NOT NULL,
    privacy_agreed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at TIMESTAMPTZ
);

-- 2. 팀/모임 테이블 (teams)
CREATE TABLE IF NOT EXISTS teams (
    team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    consensus_rule VARCHAR(10) NOT NULL DEFAULT 'all',
    consensus_min_count INTEGER CHECK (consensus_min_count >= 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 팀 멤버십 테이블 (team_members)
CREATE TABLE IF NOT EXISTS team_members (
    team_id BIGINT REFERENCES teams(team_id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(user_id),
    role VARCHAR(10) NOT NULL DEFAULT 'member',
    color VARCHAR(7) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    places_checked_at TIMESTAMPTZ,
    consensus_checked_at TIMESTAMPTZ,
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT uq_team_color UNIQUE (team_id, color)
);

-- 팀당 owner(팀장)는 1명만 존재하도록 보장하는 부분 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_owner ON team_members (team_id) WHERE role = 'owner';

-- 4. 팀 초대 링크 테이블 (team_invites)
CREATE TABLE IF NOT EXISTS team_invites (
    invite_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 팀당 유효한 활성 링크는 1개만 허용 (revoked_at이 NULL인 경우)
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_active_invite ON team_invites (team_id) WHERE revoked_at IS NULL;

-- 5. 장소/핀 테이블 (places)
CREATE TABLE IF NOT EXISTS places (
    place_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (
        category IN ('restaurant', 'cafe', 'bar', 'stay', 'attraction', 'activity', 'etc')
    ),
    road_address VARCHAR(200),
    address VARCHAR(200),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    source VARCHAR(10) NOT NULL CHECK (source IN ('search', 'manual')),
    source_link VARCHAR(500),
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    consensus_achieved_at TIMESTAMPTZ,
    consensus_member_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 장소 추천 테이블 (recommendations)
CREATE TABLE IF NOT EXISTS recommendations (
    place_id BIGINT REFERENCES places(place_id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(user_id),
    comment VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, user_id)
);

-- 7. 장소 방문 확인 테이블 (place_visits)
CREATE TABLE IF NOT EXISTS place_visits (
    place_id BIGINT REFERENCES places(place_id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(user_id),
    visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, user_id)
);

-- 8. 이벤트 로그 테이블 (event_logs)
CREATE TABLE IF NOT EXISTS event_logs (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id BIGINT REFERENCES users(user_id),
    team_id BIGINT,
    place_id BIGINT,
    properties JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================================================
-- 검색 성능 향상을 위한 인덱스
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_places_team_id ON places(team_id);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
