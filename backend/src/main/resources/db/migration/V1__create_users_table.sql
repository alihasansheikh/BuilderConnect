-- V1: Create Users and Profile Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- USERS TABLE - Core user entity for all roles
-- =====================================================
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('CLIENT', 'BUILDER', 'SUPPLIER', 'SUPPORT_AGENT', 'ADMIN', 'SUPER_ADMIN') NOT NULL,
    city VARCHAR(100),
    address VARCHAR(500),
    profile_image_url VARCHAR(500),

    -- Account Status
    active BOOLEAN DEFAULT TRUE,
    suspended BOOLEAN DEFAULT FALSE,
    suspension_reason VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(100),
    email_verification_expires_at DATETIME,

    -- Two-Factor Authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),

    -- Session Management
    refresh_token VARCHAR(500),
    refresh_token_expires_at DATETIME,
    last_login DATETIME,

    -- Password Reset
    password_reset_token VARCHAR(100),
    password_reset_expires_at DATETIME,

    -- Soft Delete
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,

    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_city (city),
    INDEX idx_users_active (active, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- USER DEVICES - Track login devices and sessions
-- =====================================================
CREATE TABLE user_devices (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(200),
    device_type ENUM('WEB', 'MOBILE', 'TABLET', 'DESKTOP') DEFAULT 'WEB',
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    ip_address VARCHAR(45),
    last_active DATETIME,
    is_current BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_devices_user (user_id),
    INDEX idx_user_devices_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BUILDER PROFILES - Extended profile for builders
-- =====================================================
CREATE TABLE builder_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,

    -- Business Information
    company_name VARCHAR(200),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(50),
    years_of_experience INT DEFAULT 0,

    -- Description and Skills
    bio TEXT,
    specializations JSON, -- Array of specialization categories
    skills JSON, -- Array of skills
    service_areas JSON, -- Array of cities/areas served

    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at DATETIME,
    verified_by BIGINT,
    verification_documents JSON, -- Array of document URLs

    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    availability_status ENUM('AVAILABLE', 'BUSY', 'ON_LEAVE', 'NOT_ACCEPTING') DEFAULT 'AVAILABLE',

    -- Pricing
    hourly_rate DECIMAL(10, 2),
    minimum_project_value DECIMAL(15, 2),

    -- Portfolio
    portfolio_images JSON, -- Array of image URLs
    portfolio_description TEXT,

    -- Statistics (denormalized for performance)
    total_projects_completed INT DEFAULT 0,
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,

    -- Subscription
    subscription_tier ENUM('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE') DEFAULT 'FREE',
    subscription_expires_at DATETIME,
    lead_credits INT DEFAULT 5,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_builder_verified (is_verified),
    INDEX idx_builder_available (is_available),
    INDEX idx_builder_rating (average_rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SUPPLIER PROFILES - Extended profile for suppliers
-- =====================================================
CREATE TABLE supplier_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,

    -- Business Information
    company_name VARCHAR(200) NOT NULL,
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(50),

    -- Description
    description TEXT,
    categories JSON, -- Array of material categories supplied

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at DATETIME,

    -- Location & Delivery
    warehouse_address VARCHAR(500),
    delivery_areas JSON, -- Array of cities served
    minimum_order_value DECIMAL(15, 2) DEFAULT 0,

    -- Statistics
    total_orders_completed INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_supplier_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
