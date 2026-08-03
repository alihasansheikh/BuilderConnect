-- V9: Create Support Ticket and Audit Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- SUPPORT TICKETS - Customer support requests
-- =====================================================
CREATE TABLE support_tickets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_number VARCHAR(20) NOT NULL UNIQUE,

    -- Submitter
    user_id BIGINT NOT NULL,

    -- Related entities
    project_id BIGINT,
    order_id BIGINT,

    -- Ticket details
    category ENUM(
        'ACCOUNT',
        'BILLING',
        'PROJECT',
        'PAYMENT',
        'TECHNICAL',
        'DISPUTE',
        'VERIFICATION',
        'FEEDBACK',
        'OTHER'
    ) NOT NULL,

    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    attachments JSON, -- Array of attachment URLs

    -- Priority and status
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    status ENUM('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED', 'REOPENED') DEFAULT 'OPEN',

    -- Assignment
    assigned_to BIGINT,
    assigned_at DATETIME,

    -- Resolution
    resolution TEXT,
    resolution_type ENUM('RESOLVED', 'DUPLICATE', 'WONT_FIX', 'INVALID', 'ESCALATED'),
    resolved_at DATETIME,
    resolved_by BIGINT,

    -- Customer satisfaction
    satisfaction_rating INT, -- 1-5
    satisfaction_comment TEXT,

    -- Timestamps
    first_response_at DATETIME,
    last_activity_at DATETIME,
    closed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES material_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_ticket_number (ticket_number),
    INDEX idx_ticket_user (user_id),
    INDEX idx_ticket_status (status),
    INDEX idx_ticket_priority (priority),
    INDEX idx_ticket_assigned (assigned_to),
    INDEX idx_ticket_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TICKET RESPONSES - Replies to support tickets
-- =====================================================
CREATE TABLE ticket_responses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_id BIGINT NOT NULL,
    responder_id BIGINT NOT NULL,

    message TEXT NOT NULL,
    attachments JSON,

    -- Type
    response_type ENUM('REPLY', 'INTERNAL_NOTE', 'STATUS_CHANGE', 'ESCALATION') DEFAULT 'REPLY',

    -- Visibility
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not visible to customer

    -- Read tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_response_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DISPUTES - Conflict resolution cases
-- =====================================================
CREATE TABLE disputes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    dispute_number VARCHAR(20) NOT NULL UNIQUE,

    -- Parties
    filed_by BIGINT NOT NULL,
    filed_against BIGINT NOT NULL,

    -- Related entities
    project_id BIGINT NOT NULL,
    milestone_id BIGINT,

    -- Dispute details
    dispute_type ENUM(
        'PAYMENT',
        'QUALITY',
        'TIMELINE',
        'SCOPE',
        'COMMUNICATION',
        'ABANDONMENT',
        'OTHER'
    ) NOT NULL,

    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    desired_resolution TEXT,
    evidence JSON, -- Array of evidence URLs/documents

    -- Amount in dispute
    disputed_amount DECIMAL(15, 2),

    -- Status
    status ENUM(
        'FILED',
        'UNDER_REVIEW',
        'MEDIATION',
        'AWAITING_RESPONSE',
        'RESOLVED',
        'ESCALATED',
        'CLOSED'
    ) DEFAULT 'FILED',

    -- Assignment
    assigned_mediator BIGINT,
    assigned_at DATETIME,

    -- Resolution
    resolution_type ENUM('FAVOR_FILER', 'FAVOR_RESPONDENT', 'MUTUAL_AGREEMENT', 'PARTIAL', 'DISMISSED', 'ESCALATED'),
    resolution_summary TEXT,
    resolution_amount DECIMAL(15, 2),
    resolved_at DATETIME,
    resolved_by BIGINT,

    -- Deadlines
    response_deadline DATETIME,
    resolution_deadline DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (filed_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (filed_against) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_mediator) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_dispute_number (dispute_number),
    INDEX idx_dispute_filed_by (filed_by),
    INDEX idx_dispute_filed_against (filed_against),
    INDEX idx_dispute_project (project_id),
    INDEX idx_dispute_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DISPUTE COMMENTS - Communication during disputes
-- =====================================================
CREATE TABLE dispute_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    dispute_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    comment TEXT NOT NULL,
    attachments JSON,

    -- Type
    comment_type ENUM('RESPONSE', 'EVIDENCE', 'MEDIATOR_NOTE', 'RESOLUTION_PROPOSAL', 'INTERNAL') DEFAULT 'RESPONSE',

    -- Visibility
    is_internal BOOLEAN DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_dispute_comment (dispute_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AUDIT LOGS - Activity tracking
-- =====================================================
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Actor
    user_id BIGINT,
    user_email VARCHAR(100),
    user_role VARCHAR(50),

    -- Action
    action VARCHAR(100) NOT NULL,
    action_category ENUM(
        'AUTH',
        'USER',
        'PROJECT',
        'BID',
        'MILESTONE',
        'PAYMENT',
        'ESCROW',
        'CHAT',
        'REVIEW',
        'ADMIN',
        'SYSTEM',
        'SECURITY'
    ) NOT NULL,

    -- Target
    entity_type VARCHAR(50),
    entity_id BIGINT,
    entity_name VARCHAR(200),

    -- Details
    description TEXT,
    old_values JSON,
    new_values JSON,
    metadata JSON,

    -- Request info
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    request_id VARCHAR(50),

    -- Status
    status ENUM('SUCCESS', 'FAILURE', 'PARTIAL') DEFAULT 'SUCCESS',
    error_message TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_category (action_category),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SYSTEM SETTINGS - Platform configuration
-- =====================================================
CREATE TABLE system_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    description VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    updated_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'BuilderConnect', 'STRING', 'Platform display name', TRUE),
('platform_fee_percentage', '5', 'NUMBER', 'Platform fee percentage on transactions', FALSE),
('min_bid_amount', '1000', 'NUMBER', 'Minimum bid amount in PKR', TRUE),
('max_bid_amount', '50000000', 'NUMBER', 'Maximum bid amount in PKR', TRUE),
('default_lead_credits', '5', 'NUMBER', 'Default lead credits for new builders', FALSE),
('bid_validity_days', '30', 'NUMBER', 'Default bid validity in days', TRUE),
('escrow_release_delay_hours', '24', 'NUMBER', 'Delay before escrow release after approval', FALSE),
('support_email', 'support@builderconnect.pk', 'STRING', 'Support email address', TRUE),
('maintenance_mode', 'false', 'BOOLEAN', 'Enable maintenance mode', FALSE);

-- =====================================================
-- ANNOUNCEMENTS - Platform announcements
-- =====================================================
CREATE TABLE announcements (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type ENUM('INFO', 'WARNING', 'MAINTENANCE', 'PROMOTION', 'UPDATE') DEFAULT 'INFO',

    -- Targeting
    target_roles JSON, -- Array of roles, null = all users
    target_cities JSON, -- Array of cities, null = all cities

    -- Display
    is_active BOOLEAN DEFAULT TRUE,
    is_dismissible BOOLEAN DEFAULT TRUE,
    display_position ENUM('TOP_BANNER', 'DASHBOARD', 'MODAL', 'SIDEBAR') DEFAULT 'DASHBOARD',

    -- Schedule
    start_date DATETIME,
    end_date DATETIME,

    -- Tracking
    view_count INT DEFAULT 0,
    click_count INT DEFAULT 0,

    created_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_announcement_active (is_active),
    INDEX idx_announcement_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add support_ticket_id foreign key to chat_rooms
ALTER TABLE chat_rooms
ADD CONSTRAINT fk_chat_support_ticket
FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id) ON DELETE SET NULL;
