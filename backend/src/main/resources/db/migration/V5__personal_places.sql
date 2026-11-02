-- 개인 지도(내 지도) 장소. 팀과 무관하게 나만 보는 장소를 저장한다.
-- 팀 장소(places)와 같은 카테고리·좌표 규칙을 쓰되, 추천·모두 인정 개념은 없다.
CREATE TABLE IF NOT EXISTS personal_places (
    personal_place_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (
        category IN ('restaurant', 'cafe', 'bar', 'stay', 'attraction', 'activity', 'etc')
    ),
    road_address VARCHAR(200),
    address VARCHAR(200),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    source VARCHAR(10) NOT NULL CHECK (source IN ('search', 'manual')),
    memo VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 내 지도 목록은 사용자별 최신순으로 읽는다
CREATE INDEX IF NOT EXISTS idx_personal_places_user ON personal_places (user_id, created_at DESC);
