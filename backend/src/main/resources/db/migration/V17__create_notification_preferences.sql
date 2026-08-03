-- V17: Notification preferences per user
CREATE TABLE notification_preferences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    email_new_bid BOOLEAN NOT NULL DEFAULT TRUE,
    email_project_update BOOLEAN NOT NULL DEFAULT TRUE,
    email_messages BOOLEAN NOT NULL DEFAULT TRUE,
    email_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    push_new_bid BOOLEAN NOT NULL DEFAULT TRUE,
    push_project_update BOOLEAN NOT NULL DEFAULT TRUE,
    push_messages BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_notif_pref_user UNIQUE (user_id)
);

CREATE INDEX idx_notif_pref_user ON notification_preferences(user_id);

-- Seed default preferences for all existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users WHERE deleted = false;
