-- 개인 핀 공개 범위: 나만(private) / 친구 전체(friends) / 모임만(team) / 전체(all)
-- 기존 공개 핀은 친구와 모임 양쪽에 보였으므로 'all' 로 옮겨 동작을 유지한다.
ALTER TABLE personal_places
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'all'
        CHECK (visibility IN ('private', 'friends', 'team', 'all'));

UPDATE personal_places
   SET visibility = CASE WHEN is_public THEN 'all' ELSE 'private' END;

-- 공개 범위로 거르는 조회(친구 오버레이·모임 오버레이)에 쓴다
CREATE INDEX IF NOT EXISTS idx_personal_places_visibility
    ON personal_places (visibility, user_id);
