-- ===================================================
-- PinMate (핀메이트) 개발용 초기 시드 데이터 (Seed Data)
-- ===================================================

-- 1. 사용자 시드 데이터
INSERT INTO users (user_id, login_id, email, nickname, status, terms_agreed_at, privacy_agreed_at)
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 'user-1', 'taeyoung@pinmate.io', '김태영', 'active', now(), now()),
    (2, 'user-2', 'minji@pinmate.io', '이민지', 'active', now(), now()),
    (3, 'user-3', 'junho@pinmate.io', '박준호', 'active', now(), now()),
    (4, 'user-4', 'soyeon@pinmate.io', '정소연', 'active', now(), now())
ON CONFLICT (login_id) DO NOTHING;

-- 2. 팀 시드 데이터
INSERT INTO teams (team_id, name, consensus_rule, consensus_min_count)
OVERRIDING SYSTEM VALUE
VALUES
    (1, '🍰 성수동 디저트 탐방대', 'all', 3),
    (2, '🍻 강남 불금 모임', 'all', 2)
ON CONFLICT DO NOTHING;

-- 3. 팀 멤버십 시드 데이터
INSERT INTO team_members (team_id, user_id, role, color)
VALUES
    (1, 1, 'owner', '#6C63FF'),
    (1, 2, 'member', '#FF6B6B'),
    (1, 3, 'member', '#4CC9F0'),
    (2, 1, 'owner', '#6C63FF'),
    (2, 4, 'member', '#06D6A0')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 4. 팀 초대 링크 시드 데이터
INSERT INTO team_invites (team_id, code, created_by, expires_at)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'seongsu123', 1, now() + interval '30 days'),
    (2, 'gangnam456', 1, now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;

-- 5. 장소(핀) 시드 데이터
INSERT INTO places (place_id, team_id, name, category, road_address, address, latitude, longitude, source, created_by, consensus_achieved_at, consensus_member_count)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, '성수동 대림창고', 'cafe', '서울 성동구 성수이로 78', '서울 성동구 성수동2가 322-32', 37.5447000, 127.0568000, 'search', 1, now(), 3),
    (2, 1, '소문난성수감자탕', 'restaurant', '서울 성동구 연무장길 45', '서울 성동구 성수동2가 315-100', 37.5428000, 127.0543000, 'search', 2, NULL, NULL),
    (3, 1, '서울숲 공원', 'attraction', '서울 성동구 뚝섬로 273', '서울 성동구 성수동1가 685', 37.5443000, 127.0374000, 'search', 3, NULL, NULL)
ON CONFLICT DO NOTHING;

-- 6. 추천 시드 데이터 (1번 대림창고는 3명 전원 추천 -> 모두 인정)
INSERT INTO recommendations (place_id, user_id, comment)
VALUES
    (1, 1, '분위기 대박인 창고형 갤러리 카페!'),
    (1, 2, '여기 커피랑 디저트 완전 인정'),
    (1, 3, '공간 넓고 힙해서 너무 좋아요'),
    (2, 1, '국물 진하고 고기 푸짐함'),
    (2, 2, '웨이팅 있지만 꼭 가봐야 함'),
    (3, 3, '산책하고 피크닉하기 최고')
ON CONFLICT (place_id, user_id) DO NOTHING;

-- 7. 방문 시드 데이터
INSERT INTO place_visits (place_id, user_id)
VALUES
    (1, 1),
    (1, 2)
ON CONFLICT (place_id, user_id) DO NOTHING;
