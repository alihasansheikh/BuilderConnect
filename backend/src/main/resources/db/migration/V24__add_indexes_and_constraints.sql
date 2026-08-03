-- V24: Missing FK indexes for query performance
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_chat_room_participants_last_read ON chat_room_participants(last_read_message_id);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(account_locked_until);
