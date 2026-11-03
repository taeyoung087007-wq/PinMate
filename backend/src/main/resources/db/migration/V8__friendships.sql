-- 친구 관계. 요청한 사람(requester) → 받은 사람(addressee) 방향으로 한 행만 둔다.
-- 수락하면 status = 'accepted' 가 되고, 그때부터 양방향 친구다.
CREATE TABLE IF NOT EXISTS friendships (
    requester_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    addressee_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (requester_id, addressee_id),
    CONSTRAINT chk_friendship_not_self CHECK (requester_id <> addressee_id)
);

-- 같은 두 사람 사이에 방향만 다른 행이 두 개 생기지 않게 한다
CREATE UNIQUE INDEX IF NOT EXISTS uq_friendship_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
