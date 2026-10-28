-- ===================================================
-- 프로필 아바타 (설정 > 프로필 수정)
-- avatar_bg 는 지도용 팀 색(team_members.color)과 별개인 프로필 배경색
-- 이미 수동으로 추가한 DB 에서도 실패하지 않도록 IF NOT EXISTS
-- ===================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS avatar_bg VARCHAR(7);
