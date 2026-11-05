-- V2 시드는 db/migration 안에 있어 환경을 가리지 않고 실행된다(운영 포함).
-- 가짜 회원이 친구 검색에 나오고 실명 닉네임이 막히지 않도록 시드 행을 지운다.
--
-- 안전장치: 번호만으로 지우지 않고 시드 값(login_id·팀 이름)이 정확히 일치할 때만 지운다.
-- 실제 사용자가 그 번호를 쓰고 있으면 아무 것도 지워지지 않는다.
-- (2026-11-05 운영 DB 확인: user_id 1~4, team_id 1~2 없음 / users 는 8번부터, teams 는 7번부터 → 이 마이그레이션은 no-op)
-- 시드 회원은 password_hash 가 없어 로그인할 수 없으므로, 시드 팀 밖에 이들이 만든 실제 장소는 존재하지 않는다.

-- 1) users 를 참조하지만 ON DELETE CASCADE 가 아닌 행 먼저 정리
DELETE FROM event_logs
 WHERE user_id IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

DELETE FROM place_visits
 WHERE user_id IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

DELETE FROM recommendations
 WHERE user_id IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

DELETE FROM team_members
 WHERE user_id IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

DELETE FROM team_invites
 WHERE created_by IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

-- 2) 시드 모임을 지우면 places → recommendations·place_visits, team_members, team_invites, sync_notifications 가 CASCADE
DELETE FROM teams
 WHERE team_id IN (1, 2)
   AND name IN ('🍰 성수동 디저트 탐방대', '🍻 강남 불금 모임');

DELETE FROM places
 WHERE created_by IN (SELECT user_id FROM users WHERE login_id IN ('user-1', 'user-2', 'user-3', 'user-4'));

-- 3) 회원 삭제로 friendships·personal_places·sync_notifications(actor/recipient) 도 CASCADE
DELETE FROM users
 WHERE user_id IN (1, 2, 3, 4)
   AND login_id IN ('user-1', 'user-2', 'user-3', 'user-4');
