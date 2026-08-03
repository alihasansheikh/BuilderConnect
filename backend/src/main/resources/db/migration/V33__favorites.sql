-- =====================================================
-- V33: Favorites — user bookmarks for materials/projects
-- =====================================================
-- Generic (user_id, entity_type, entity_id) bookmark table, modeled on
-- V8 review_helpfulness. entity_type is VARCHAR (not SQL ENUM) so new
-- favoritable entities need no migration; values enforced by the Java enum.
-- =====================================================

CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY uk_favorite (user_id, entity_type, entity_id),
    INDEX idx_favorite_user (user_id, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
