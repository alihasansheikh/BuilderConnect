-- V12: Change requests for scope/budget/timeline modifications

CREATE TABLE IF NOT EXISTS change_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    change_type ENUM('SCOPE', 'BUDGET', 'TIMELINE') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    proposed_value TEXT NULL,
    current_value TEXT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    rejection_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cr_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_cr_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_cr_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_cr_project ON change_requests(project_id);
CREATE INDEX idx_cr_status ON change_requests(status);
CREATE INDEX idx_cr_requested_by ON change_requests(requested_by);
