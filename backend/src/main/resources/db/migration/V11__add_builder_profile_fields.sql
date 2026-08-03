-- V11: Add enhanced builder profile fields, subscription plans, and lead transaction tracking

-- =====================================================
-- 1. ADD NEW COLUMNS TO BUILDER_PROFILES
-- =====================================================
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS primary_trade VARCHAR(100) NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS secondary_trades JSON NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS experience_per_trade JSON NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS ntn_number VARCHAR(50) NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS pec_number VARCHAR(50) NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS team_members JSON NULL;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS service_area_radius INT DEFAULT 50;

-- =====================================================
-- 2. SUBSCRIPTION PLANS (reference table)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    tier ENUM('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL UNIQUE,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    billing_cycle ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    lead_credits_per_month INT NOT NULL DEFAULT 5,
    max_active_bids INT NOT NULL DEFAULT 3,
    max_portfolio_images INT NOT NULL DEFAULT 5,
    featured_listing BOOLEAN NOT NULL DEFAULT FALSE,
    priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    analytics_access BOOLEAN NOT NULL DEFAULT FALSE,
    badge_label VARCHAR(50) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed subscription plans
INSERT INTO subscription_plans (name, tier, price, billing_cycle, lead_credits_per_month, max_active_bids, max_portfolio_images, featured_listing, priority_support, analytics_access, badge_label, description) VALUES
('Free', 'FREE', 0, 'MONTHLY', 5, 3, 5, FALSE, FALSE, FALSE, NULL, 'Get started with basic features. Ideal for new builders.'),
('Basic', 'BASIC', 2999, 'MONTHLY', 20, 10, 15, FALSE, FALSE, TRUE, 'Basic', 'Grow your business with more leads and analytics.'),
('Professional', 'PROFESSIONAL', 7999, 'MONTHLY', 50, 25, 50, TRUE, TRUE, TRUE, 'Pro', 'Stand out with featured listings and priority support.'),
('Enterprise', 'ENTERPRISE', 14999, 'MONTHLY', 999, 999, 999, TRUE, TRUE, TRUE, 'Enterprise', 'Unlimited access for large construction firms.');

-- =====================================================
-- 3. LEAD TRANSACTIONS (track credit usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    builder_profile_id BIGINT NOT NULL,
    transaction_type ENUM('CREDIT', 'DEBIT', 'BONUS', 'REFUND', 'SUBSCRIPTION_RENEWAL') NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lead_tx_builder FOREIGN KEY (builder_profile_id) REFERENCES builder_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_lead_tx_builder ON lead_transactions(builder_profile_id);
CREATE INDEX idx_lead_tx_type ON lead_transactions(transaction_type);
CREATE INDEX idx_lead_tx_created ON lead_transactions(created_at);
