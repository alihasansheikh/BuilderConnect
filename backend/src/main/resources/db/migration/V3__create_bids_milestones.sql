-- V3: Create Bids and Milestones Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- BIDS - Builder proposals for projects
-- =====================================================
CREATE TABLE bids (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bid_number VARCHAR(20) NOT NULL UNIQUE,

    -- Relationships
    project_id BIGINT NOT NULL,
    builder_id BIGINT NOT NULL,

    -- Bid Details
    amount DECIMAL(15, 2) NOT NULL,
    proposal TEXT NOT NULL,
    work_plan TEXT,
    estimated_duration_days INT NOT NULL,

    -- Breakdown (optional)
    labor_cost DECIMAL(15, 2),
    material_cost DECIMAL(15, 2),
    other_cost DECIMAL(15, 2),
    cost_breakdown JSON, -- Detailed breakdown

    -- Attachments
    attachments JSON, -- Array of attachment URLs

    -- Status
    status ENUM(
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'ACCEPTED',
        'REJECTED',
        'WITHDRAWN',
        'EXPIRED'
    ) NOT NULL DEFAULT 'DRAFT',

    -- Response from client
    client_notes TEXT,
    rejection_reason TEXT,

    -- Validity
    valid_until DATE,

    -- Important Dates
    submitted_at DATETIME,
    reviewed_at DATETIME,
    accepted_at DATETIME,
    rejected_at DATETIME,
    withdrawn_at DATETIME,

    -- Credit tracking (for lead credits)
    credits_used INT DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (builder_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Unique constraint: one bid per builder per project
    UNIQUE KEY uk_bid_project_builder (project_id, builder_id),

    INDEX idx_bid_project (project_id),
    INDEX idx_bid_builder (builder_id),
    INDEX idx_bid_status (status),
    INDEX idx_bid_amount (amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MILESTONES - Project phases with payments
-- =====================================================
CREATE TABLE milestones (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    sequence_order INT NOT NULL DEFAULT 1,

    -- Payment
    payment_amount DECIMAL(15, 2) NOT NULL,
    payment_percentage DECIMAL(5, 2), -- % of total project value

    -- Timeline
    start_date DATE,
    due_date DATE,
    completed_at DATETIME,
    approved_at DATETIME,

    -- Status
    status ENUM(
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'PAYMENT_PENDING',
        'PAYMENT_RELEASED',
        'DISPUTED'
    ) NOT NULL DEFAULT 'PENDING',

    -- Progress
    progress_percentage INT DEFAULT 0,

    -- Deliverables
    deliverables JSON, -- Array of expected deliverables
    completion_evidence JSON, -- Array of evidence URLs/descriptions

    -- Approval
    rejection_reason TEXT,
    approved_by BIGINT,

    -- Payment release
    payment_released_at DATETIME,
    payment_transaction_id BIGINT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_milestone_project (project_id),
    INDEX idx_milestone_status (status),
    INDEX idx_milestone_order (project_id, sequence_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key for current milestone in projects
ALTER TABLE projects
ADD CONSTRAINT fk_project_current_milestone
FOREIGN KEY (current_milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

-- Add foreign key for milestone in tasks
ALTER TABLE project_tasks
ADD CONSTRAINT fk_task_milestone
FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

-- =====================================================
-- MILESTONE UPDATES - Progress updates on milestones
-- =====================================================
CREATE TABLE milestone_updates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    milestone_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,

    update_type ENUM('PROGRESS', 'NOTE', 'ISSUE', 'PHOTO', 'COMPLETION_REQUEST') NOT NULL DEFAULT 'PROGRESS',
    message TEXT NOT NULL,
    progress_percentage INT,
    attachments JSON, -- Array of attachment URLs

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_update_milestone (milestone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BID MESSAGES - Communication during bidding
-- =====================================================
CREATE TABLE bid_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bid_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,

    message TEXT NOT NULL,
    attachments JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_bid_message (bid_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
