-- ===================================================
-- IDENTITY 시퀀스 값을 현재 최대 ID로 동기화
-- ===================================================

SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('teams', 'team_id'), COALESCE((SELECT MAX(team_id) FROM teams), 1));
SELECT setval(pg_get_serial_sequence('places', 'place_id'), COALESCE((SELECT MAX(place_id) FROM places), 1));
SELECT setval(pg_get_serial_sequence('team_invites', 'invite_id'), COALESCE((SELECT MAX(invite_id) FROM team_invites), 1));
