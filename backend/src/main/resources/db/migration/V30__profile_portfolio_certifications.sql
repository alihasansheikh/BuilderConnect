-- =====================================================
-- V30: Profile feature — portfolio items + certifications
-- =====================================================
-- Backs the LinkedIn/Upwork-style profile page. Both tables are keyed on user_id (the builder),
-- so they extend to other roles later without a schema change. Managed by the owner; visible to
-- any logged-in viewer.
-- =====================================================

CREATE TABLE IF NOT EXISTS portfolio_items (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    images        JSON,                 -- array of "/uploads/portfolio/..." urls
    project_cost  DECIMAL(15,2),
    duration_days INT,
    project_year  INT,               -- 'year' is a reserved word in H2
    external_url  VARCHAR(500),
    display_order INT DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_portfolio_user ON portfolio_items(user_id);

CREATE TABLE IF NOT EXISTS certifications (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    issuing_organization  VARCHAR(200),
    issue_date            DATE,
    expiry_date           DATE,
    credential_id         VARCHAR(100),
    credential_url        VARCHAR(500),
    document_url          VARCHAR(500),   -- uploaded certificate (image/pdf)
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_certification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_certification_user ON certifications(user_id);
