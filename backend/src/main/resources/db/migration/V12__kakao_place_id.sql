-- 같은 장소 판별 키 (F-36). 카카오 장소 검색 결과의 id
-- 기존 행과 지도에서 직접 찍은 핀은 NULL 이고, 그때는 지금처럼 '이름 + 50m' 로 판별한다
ALTER TABLE places
    ADD COLUMN IF NOT EXISTS kakao_place_id VARCHAR(30);

ALTER TABLE personal_places
    ADD COLUMN IF NOT EXISTS kakao_place_id VARCHAR(30);

-- 알림에도 복사해 둔다 (모임 장소가 지워진 뒤에도 내 지도의 같은 장소를 찾을 수 있게)
ALTER TABLE sync_notifications
    ADD COLUMN IF NOT EXISTS kakao_place_id VARCHAR(30);

-- 값이 있는 행끼리만 검사한다. 두 요청이 동시에 와도 같은 장소가 한 행만 남는다
CREATE UNIQUE INDEX IF NOT EXISTS uq_places_team_kakao
    ON places (team_id, kakao_place_id) WHERE kakao_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_places_user_kakao
    ON personal_places (user_id, kakao_place_id) WHERE kakao_place_id IS NOT NULL;
