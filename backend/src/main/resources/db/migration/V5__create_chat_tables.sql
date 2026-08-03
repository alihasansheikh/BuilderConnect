-- V5: Create Chat and Messaging Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- CHAT ROOMS - Conversation containers
-- =====================================================
CREATE TABLE chat_rooms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_code VARCHAR(50) NOT NULL UNIQUE,

    -- Room Type
    room_type ENUM(
        'PROJECT',      -- Project-related chat
        'BID',          -- Bid discussion
        'SUPPORT',      -- Support ticket chat
        'DIRECT',       -- Direct message between users
        'GROUP'         -- Group chat
    ) NOT NULL,

    -- Related entities
    project_id BIGINT,
    bid_id BIGINT,
    support_ticket_id BIGINT,

    -- Room info
    name VARCHAR(200),
    description VARCHAR(500),

    -- Participants (for direct/group chats)
    created_by BIGINT,

    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,

    -- Last activity
    last_message_at DATETIME,
    last_message_preview VARCHAR(200),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_chat_room_code (room_code),
    INDEX idx_chat_room_project (project_id),
    INDEX idx_chat_room_type (room_type),
    INDEX idx_chat_room_last_message (last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CHAT ROOM PARTICIPANTS - Users in chat rooms
-- =====================================================
CREATE TABLE chat_room_participants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chat_room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    -- Role in chat
    role ENUM('OWNER', 'ADMIN', 'MEMBER', 'OBSERVER') DEFAULT 'MEMBER',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_muted BOOLEAN DEFAULT FALSE,
    muted_until DATETIME,

    -- Read tracking
    last_read_at DATETIME,
    last_read_message_id BIGINT,
    unread_count INT DEFAULT 0,

    -- Joined/Left tracking
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,

    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY uk_participant (chat_room_id, user_id),
    INDEX idx_participant_user (user_id),
    INDEX idx_participant_room (chat_room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CHAT MESSAGES - Individual messages
-- =====================================================
CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chat_room_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,

    -- Message content
    message_type ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'MILESTONE_UPDATE', 'PAYMENT_NOTIFICATION') DEFAULT 'TEXT',
    content TEXT,

    -- Attachments
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(50),
    attachment_size BIGINT,

    -- Reply to another message
    reply_to_id BIGINT,

    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,

    -- Metadata
    metadata JSON, -- Additional data for special message types

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL,

    INDEX idx_message_room (chat_room_id),
    INDEX idx_message_sender (sender_id),
    INDEX idx_message_created (created_at DESC),
    INDEX idx_message_room_created (chat_room_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key for last read message
ALTER TABLE chat_room_participants
ADD CONSTRAINT fk_participant_last_read
FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- =====================================================
-- MESSAGE READ RECEIPTS - Track who read messages
-- =====================================================
CREATE TABLE message_read_receipts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY uk_read_receipt (message_id, user_id),
    INDEX idx_receipt_message (message_id),
    INDEX idx_receipt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NOTIFICATIONS - In-app notifications
-- =====================================================
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,

    -- Notification type
    notification_type ENUM(
        'NEW_BID',
        'BID_ACCEPTED',
        'BID_REJECTED',
        'PROJECT_AWARDED',
        'MILESTONE_COMPLETED',
        'MILESTONE_APPROVED',
        'PAYMENT_RECEIVED',
        'PAYMENT_RELEASED',
        'NEW_MESSAGE',
        'NEW_REVIEW',
        'DISPUTE_OPENED',
        'DISPUTE_RESOLVED',
        'ACCOUNT_VERIFIED',
        'SUBSCRIPTION_EXPIRING',
        'SYSTEM_ANNOUNCEMENT'
    ) NOT NULL,

    -- Content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50),

    -- Related entities
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,
    action_url VARCHAR(500),

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,

    -- Delivery
    sent_email BOOLEAN DEFAULT FALSE,
    email_sent_at DATETIME,
    sent_push BOOLEAN DEFAULT FALSE,
    push_sent_at DATETIME,

    -- Priority
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',

    -- Expiry
    expires_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_notification_user (user_id),
    INDEX idx_notification_unread (user_id, is_read),
    INDEX idx_notification_type (notification_type),
    INDEX idx_notification_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EMAIL LOGS - Track sent emails
-- =====================================================
CREATE TABLE email_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    recipient_email VARCHAR(100) NOT NULL,

    -- Email details
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    template_name VARCHAR(100),
    template_data JSON,

    -- Status
    status ENUM('PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED') DEFAULT 'PENDING',
    failure_reason VARCHAR(500),

    -- Provider info
    provider VARCHAR(50) DEFAULT 'MOCK',
    external_message_id VARCHAR(100),

    -- Timestamps
    sent_at DATETIME,
    delivered_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_email_user (user_id),
    INDEX idx_email_status (status),
    INDEX idx_email_type (email_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
