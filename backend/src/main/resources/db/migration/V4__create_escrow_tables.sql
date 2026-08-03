-- V4: Create Escrow and Payment Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- ESCROW ACCOUNTS - Holds funds for projects
-- =====================================================
CREATE TABLE escrow_accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL UNIQUE,
    client_id BIGINT NOT NULL,

    -- Balances
    total_funded DECIMAL(15, 2) DEFAULT 0,
    total_released DECIMAL(15, 2) DEFAULT 0,
    total_refunded DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    pending_release DECIMAL(15, 2) DEFAULT 0,

    -- Currency
    currency VARCHAR(3) DEFAULT 'PKR',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    closed_at DATETIME,
    closed_reason VARCHAR(200),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_escrow_project (project_id),
    INDEX idx_escrow_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ESCROW TRANSACTIONS - All escrow movements
-- =====================================================
CREATE TABLE escrow_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    escrow_account_id BIGINT NOT NULL,
    transaction_reference VARCHAR(50) NOT NULL UNIQUE,

    -- Transaction Type
    transaction_type ENUM(
        'FUND',           -- Client adds funds
        'RELEASE',        -- Release to builder
        'REFUND',         -- Refund to client
        'HOLD',           -- Hold for milestone
        'DISPUTE_HOLD',   -- Hold due to dispute
        'DISPUTE_RELEASE',-- Release after dispute resolution
        'FEE',            -- Platform fee deduction
        'ADJUSTMENT'      -- Manual adjustment
    ) NOT NULL,

    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    fee_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,

    -- Balance after transaction
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,

    -- Related entities
    milestone_id BIGINT,
    payment_id BIGINT,

    -- Description
    description VARCHAR(500),
    notes TEXT,

    -- Status
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED') DEFAULT 'PENDING',

    -- External payment reference (for real payments)
    external_reference VARCHAR(100),
    payment_provider VARCHAR(50), -- 'MOCK', 'STRIPE', 'PAYPAL'

    -- Initiated by
    initiated_by BIGINT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    FOREIGN KEY (escrow_account_id) REFERENCES escrow_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_escrow_tx_account (escrow_account_id),
    INDEX idx_escrow_tx_type (transaction_type),
    INDEX idx_escrow_tx_status (status),
    INDEX idx_escrow_tx_milestone (milestone_id),
    INDEX idx_escrow_tx_reference (transaction_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PAYMENTS - All payment records
-- =====================================================
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    payment_reference VARCHAR(50) NOT NULL UNIQUE,

    -- Parties
    payer_id BIGINT NOT NULL,
    payee_id BIGINT,

    -- Related entities
    project_id BIGINT,
    milestone_id BIGINT,
    escrow_transaction_id BIGINT,

    -- Payment Details
    payment_type ENUM(
        'ESCROW_FUND',
        'MILESTONE_RELEASE',
        'REFUND',
        'SUBSCRIPTION',
        'LEAD_CREDIT_PURCHASE',
        'PLATFORM_FEE'
    ) NOT NULL,

    amount DECIMAL(15, 2) NOT NULL,
    fee_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',

    -- Payment Method
    payment_method ENUM('MOCK', 'STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'CASH') DEFAULT 'MOCK',

    -- Status
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') DEFAULT 'PENDING',
    failure_reason VARCHAR(500),

    -- External provider info
    external_payment_id VARCHAR(100),
    external_payment_status VARCHAR(50),
    payment_provider_response JSON,

    -- Timestamps
    initiated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    failed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (escrow_transaction_id) REFERENCES escrow_transactions(id) ON DELETE SET NULL,

    INDEX idx_payment_reference (payment_reference),
    INDEX idx_payment_payer (payer_id),
    INDEX idx_payment_payee (payee_id),
    INDEX idx_payment_project (project_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key for payment transaction in milestones
ALTER TABLE milestones
ADD CONSTRAINT fk_milestone_payment_tx
FOREIGN KEY (payment_transaction_id) REFERENCES escrow_transactions(id) ON DELETE SET NULL;

-- Add foreign key for payment in escrow transactions
ALTER TABLE escrow_transactions
ADD CONSTRAINT fk_escrow_tx_payment
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- =====================================================
-- INVOICES - Generated invoices
-- =====================================================
CREATE TABLE invoices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,

    -- Parties
    issued_to BIGINT NOT NULL,
    issued_by BIGINT,

    -- Related entities
    project_id BIGINT,
    payment_id BIGINT,

    -- Invoice Details
    invoice_type ENUM('PROJECT', 'SUBSCRIPTION', 'SERVICE', 'CREDIT_NOTE') NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',

    -- Line items
    line_items JSON, -- Array of line item objects

    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,

    -- Status
    status ENUM('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED') DEFAULT 'DRAFT',

    -- Document
    document_url VARCHAR(500),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (issued_to) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,

    INDEX idx_invoice_number (invoice_number),
    INDEX idx_invoice_issued_to (issued_to),
    INDEX idx_invoice_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BUILDER PAYOUTS - Scheduled payouts to builders
-- =====================================================
CREATE TABLE builder_payouts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    payout_reference VARCHAR(50) NOT NULL UNIQUE,

    builder_id BIGINT NOT NULL,

    -- Amount
    gross_amount DECIMAL(15, 2) NOT NULL,
    platform_fee DECIMAL(15, 2) DEFAULT 0,
    tax_withheld DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',

    -- Bank details (encrypted in production)
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_title VARCHAR(100),

    -- Status
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',

    -- Included transactions
    included_transactions JSON, -- Array of escrow_transaction_ids

    -- Processing
    processed_at DATETIME,
    external_reference VARCHAR(100),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (builder_id) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_payout_builder (builder_id),
    INDEX idx_payout_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
