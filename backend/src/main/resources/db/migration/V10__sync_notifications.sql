-- 동기화 알림. 팀원이 장소를 추가·삭제하면 받는 사람마다 한 행씩 쌓인다.
-- 받는 사람이 반영(내 지도에 담기/삭제)하거나 무시하면 status 가 바뀐다.
-- 장소가 지워진 뒤에도 알림을 보여주고 반영할 수 있도록 장소 정보를 복사해 둔다 (pin_id 는 참고용).
CREATE TABLE IF NOT EXISTS sync_notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    pin_id BIGINT,
    actor_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('added', 'deleted')),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'ignored')),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    road_address VARCHAR(200),
    address VARCHAR(200),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    memo VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    handled_at TIMESTAMPTZ
);

-- 알림 탭은 내 것만 최신순으로 읽는다
CREATE INDEX IF NOT EXISTS idx_sync_notifications_recipient
    ON sync_notifications (recipient_id, status, created_at DESC);

-- 장소가 지워질 때 처리 안 한 '추가' 알림을 정리한다
CREATE INDEX IF NOT EXISTS idx_sync_notifications_pin
    ON sync_notifications (pin_id, type, status);
