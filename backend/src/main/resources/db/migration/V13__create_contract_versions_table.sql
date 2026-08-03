-- V13: Contract version history tracking

CREATE TABLE IF NOT EXISTS contract_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    scope_of_work TEXT NULL,
    terms_and_conditions TEXT NULL,
    total_amount DECIMAL(15,2) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    change_summary TEXT NULL,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cv_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),
    CONSTRAINT fk_cv_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT uq_cv_contract_version UNIQUE (contract_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_cv_contract ON contract_versions(contract_id);
