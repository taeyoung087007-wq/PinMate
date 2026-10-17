-- ===================================================
-- PinMate (핀메이트) PostgreSQL 데이터베이스 스키마
-- 작성일: 2026-10-18
-- 개발자 3명 협업용 기본 DDL
-- ===================================================

-- 1. 사용자 테이블 (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(16) DEFAULT '#6C63FF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 모임/팀 테이블 (Teams)
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    all_approval_threshold VARCHAR(20) DEFAULT 'ALL', -- 'ALL'(전원), 'MAJORITY'(과반수)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 팀 멤버십 테이블 (Team Members)
CREATE TABLE IF NOT EXISTS team_members (
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER'
    member_color VARCHAR(16),           -- 팀 내 고유 식별 색상
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- 4. 장소/핀 테이블 (Places / Pins)
CREATE TABLE IF NOT EXISTS places (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,      -- 'food', 'cafe', 'drink', 'stay', 'sight', 'play', 'etc'
    lat NUMERIC(10, 7) NOT NULL,        -- 위도 (예: 37.5665000)
    lng NUMERIC(10, 7) NOT NULL,        -- 경도 (예: 126.9780000)
    memo TEXT,                          -- 등록자 한 줄 메모
    added_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    is_all_approved BOOLEAN DEFAULT FALSE, -- 팀원 전원 추천 여부
    all_approved_at TIMESTAMP WITH TIME ZONE, -- 모두 인정 달성 시점
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 장소 추천 기록 테이블 (Place Recommendations)
CREATE TABLE IF NOT EXISTS place_recommendations (
    id BIGSERIAL PRIMARY KEY,
    place_id VARCHAR(64) REFERENCES places(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    comment VARCHAR(255),               -- 추천 시 한 줄 코멘트 (선택)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (place_id, user_id)          -- 1인 1회 추천 원칙
);

-- 6. 장소 방문 확인 테이블 (Place Visits)
CREATE TABLE IF NOT EXISTS place_visits (
    place_id VARCHAR(64) REFERENCES places(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (place_id, user_id)
);

-- ===================================================
-- 인덱스 설정
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_places_team_id ON places(team_id);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_all_approved ON places(is_all_approved);
CREATE INDEX IF NOT EXISTS idx_recommendations_place ON place_recommendations(place_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
