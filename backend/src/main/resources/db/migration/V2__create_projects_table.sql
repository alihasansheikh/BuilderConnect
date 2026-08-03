-- V2: Create Projects Table
-- BuilderConnect v2 Database Schema

-- =====================================================
-- PROJECT CATEGORIES - Types of construction work
-- =====================================================
CREATE TABLE project_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    parent_id BIGINT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES project_categories(id) ON DELETE SET NULL,
    INDEX idx_category_parent (parent_id),
    INDEX idx_category_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PROJECTS - Main project entity
-- =====================================================
CREATE TABLE projects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_number VARCHAR(20) NOT NULL UNIQUE,

    -- Ownership
    client_id BIGINT NOT NULL,
    awarded_builder_id BIGINT,

    -- Basic Information
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT,
    category_name VARCHAR(100), -- Denormalized for faster queries

    -- Location
    city VARCHAR(100) NOT NULL,
    location_address VARCHAR(500),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),

    -- Budget & Timeline
    budget_min DECIMAL(15, 2),
    budget_max DECIMAL(15, 2),
    final_budget DECIMAL(15, 2),
    deadline DATE,
    estimated_duration_days INT,

    -- Requirements
    required_skills JSON, -- Array of required skills
    attachments JSON, -- Array of attachment URLs
    special_requirements TEXT,

    -- Status
    status ENUM(
        'DRAFT',
        'OPEN',
        'BIDDING',
        'AWARDED',
        'CONTRACT_PENDING',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED'
    ) NOT NULL DEFAULT 'DRAFT',

    -- Flags
    is_urgent BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    allow_partial_bids BOOLEAN DEFAULT FALSE,

    -- Progress Tracking
    progress_percentage INT DEFAULT 0,
    current_milestone_id BIGINT,

    -- Important Dates
    published_at DATETIME,
    bidding_deadline DATETIME,
    awarded_at DATETIME,
    started_at DATETIME,
    expected_completion_date DATE,
    actual_completion_date DATE,
    cancelled_at DATETIME,
    cancellation_reason TEXT,

    -- Contract
    contract_signed_at DATETIME,
    contract_document_url VARCHAR(500),

    -- Visibility
    is_public BOOLEAN DEFAULT TRUE,

    -- Soft Delete
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,

    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (awarded_builder_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES project_categories(id) ON DELETE SET NULL,

    INDEX idx_project_number (project_number),
    INDEX idx_project_client (client_id),
    INDEX idx_project_builder (awarded_builder_id),
    INDEX idx_project_status (status),
    INDEX idx_project_city (city),
    INDEX idx_project_category (category_id),
    INDEX idx_project_created (created_at DESC),
    INDEX idx_project_deadline (deadline),
    INDEX idx_project_budget (budget_min, budget_max),
    INDEX idx_project_featured (is_featured, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PROJECT TASKS - Granular work items within projects
-- =====================================================
CREATE TABLE project_tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    milestone_id BIGINT,
    parent_task_id BIGINT,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    sequence_order INT DEFAULT 0,

    -- Assignment
    assigned_to BIGINT,

    -- Status & Progress
    status ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED') DEFAULT 'TODO',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    progress_percentage INT DEFAULT 0,

    -- Timeline
    start_date DATE,
    due_date DATE,
    completed_at DATETIME,

    -- Estimation
    estimated_hours DECIMAL(6, 2),
    actual_hours DECIMAL(6, 2),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES project_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_task_project (project_id),
    INDEX idx_task_milestone (milestone_id),
    INDEX idx_task_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PROJECT ATTACHMENTS - Files attached to projects
-- =====================================================
CREATE TABLE project_attachments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    description VARCHAR(500),

    attachment_type ENUM('REQUIREMENT', 'DESIGN', 'CONTRACT', 'PROGRESS', 'OTHER') DEFAULT 'OTHER',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_attachment_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CONTRACTS - Legal agreements between parties
-- =====================================================
CREATE TABLE contracts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL UNIQUE,
    contract_number VARCHAR(30) NOT NULL UNIQUE,

    -- Parties
    client_id BIGINT NOT NULL,
    builder_id BIGINT NOT NULL,

    -- Terms
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_terms TEXT,
    scope_of_work TEXT,
    terms_and_conditions TEXT,
    special_clauses TEXT,

    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    status ENUM('DRAFT', 'PENDING_CLIENT', 'PENDING_BUILDER', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'DISPUTED') DEFAULT 'DRAFT',

    -- Signatures (simulated)
    client_signed_at DATETIME,
    client_ip_address VARCHAR(45),
    builder_signed_at DATETIME,
    builder_ip_address VARCHAR(45),

    -- Document
    document_url VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (builder_id) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_contract_project (project_id),
    INDEX idx_contract_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default project categories
INSERT INTO project_categories (name, slug, description, icon, display_order) VALUES
('New Construction', 'new-construction', 'Building new structures from scratch', 'building', 1),
('Renovation', 'renovation', 'Renovating and remodeling existing structures', 'hammer', 2),
('Interior Design', 'interior-design', 'Interior design and decoration', 'paint-brush', 3),
('Electrical Work', 'electrical', 'Electrical installation and repair', 'zap', 4),
('Plumbing', 'plumbing', 'Plumbing installation and repair', 'droplet', 5),
('Painting', 'painting', 'Interior and exterior painting', 'palette', 6),
('Flooring', 'flooring', 'Floor installation and refinishing', 'grid', 7),
('Roofing', 'roofing', 'Roof installation and repair', 'home', 8),
('Landscaping', 'landscaping', 'Outdoor landscaping and gardens', 'tree', 9),
('HVAC', 'hvac', 'Heating, ventilation, and air conditioning', 'thermometer', 10),
('Kitchen Remodeling', 'kitchen', 'Kitchen renovation and remodeling', 'utensils', 11),
('Bathroom Remodeling', 'bathroom', 'Bathroom renovation and remodeling', 'bath', 12);
