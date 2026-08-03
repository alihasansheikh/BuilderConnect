-- V47: authenticated AI Assistant — one ongoing saved thread per user.
CREATE TABLE IF NOT EXISTS ai_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,           -- USER | ASSISTANT
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_messages_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ai_messages_user ON ai_messages(user_id, created_at);

-- Admin kill-switch for the authenticated assistant (independent of the public FAQ bot's chatbot_enabled).
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES ('ai_assistant_enabled', 'true', 'BOOLEAN', 'Enable the authenticated AI Assistant for clients and builders', FALSE);
