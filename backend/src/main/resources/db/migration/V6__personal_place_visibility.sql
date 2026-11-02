-- 개인 장소 공개 여부. 공개한 핀만 모임 지도에 오버레이(공유)된다.
ALTER TABLE personal_places
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 공개 핀만 골라 읽는 경우가 많다 (모임 지도 오버레이)
CREATE INDEX IF NOT EXISTS idx_personal_places_public ON personal_places (user_id, is_public)
    WHERE is_public = true;
