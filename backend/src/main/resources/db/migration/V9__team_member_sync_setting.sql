-- 모임 장소를 내 지도에도 자동 저장할지 (사람마다 다르게, 모임별로 따로).
-- 꺼져 있으면 장소를 추가할 때 '내 지도에도 저장' 체크가 기본으로 꺼진 상태로 보인다.
ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS sync_to_personal BOOLEAN NOT NULL DEFAULT false;
