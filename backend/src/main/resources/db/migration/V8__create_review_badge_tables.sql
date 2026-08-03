-- V8: Create Review and Badge Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- REVIEWS - User reviews and ratings
-- =====================================================
CREATE TABLE reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- Parties
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,

    -- Related entities
    project_id BIGINT,
    material_order_id BIGINT,

    -- Review type
    review_type ENUM(
        'CLIENT_TO_BUILDER',
        'BUILDER_TO_CLIENT',
        'CLIENT_TO_SUPPLIER',
        'BUILDER_TO_SUPPLIER',
        'MATERIAL_REVIEW'
    ) NOT NULL,

    -- Ratings (1-5 stars)
    overall_rating INT NOT NULL,
    quality_rating INT,
    communication_rating INT,
    timeliness_rating INT,
    value_rating INT,
    professionalism_rating INT,

    -- Content
    title VARCHAR(200),
    comment TEXT,
    pros TEXT,
    cons TEXT,

    -- Photos
    photos JSON, -- Array of photo URLs

    -- Status
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN') DEFAULT 'PENDING',
    moderation_notes TEXT,
    moderated_by BIGINT,
    moderated_at DATETIME,

    -- Response
    response TEXT,
    response_at DATETIME,

    -- Flags
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Helpfulness
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (material_order_id) REFERENCES material_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,

    -- One review per reviewer per project per type
    UNIQUE KEY uk_review (reviewer_id, project_id, review_type),

    INDEX idx_review_reviewer (reviewer_id),
    INDEX idx_review_reviewee (reviewee_id),
    INDEX idx_review_project (project_id),
    INDEX idx_review_type (review_type),
    INDEX idx_review_rating (overall_rating),
    INDEX idx_review_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- REVIEW HELPFULNESS - Track helpful votes
-- =====================================================
CREATE TABLE review_helpfulness (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    review_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY uk_review_helpfulness (review_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- BADGES - Achievement definitions
-- =====================================================
CREATE TABLE badges (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20),

    -- Category
    category ENUM('ACHIEVEMENT', 'VERIFICATION', 'MILESTONE', 'LOYALTY', 'SPECIAL') NOT NULL,

    -- Applicable roles
    applicable_roles JSON, -- Array of roles that can earn this badge

    -- Criteria
    criteria_type ENUM('AUTOMATIC', 'MANUAL', 'VERIFICATION') DEFAULT 'AUTOMATIC',
    criteria_config JSON, -- Configuration for automatic criteria checking

    -- Rewards
    lead_credit_bonus INT DEFAULT 0,
    profile_boost_days INT DEFAULT 0,

    -- Display
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_badge_category (category),
    INDEX idx_badge_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- USER BADGES - Badges earned by users
-- =====================================================
CREATE TABLE user_badges (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    badge_id BIGINT NOT NULL,

    -- Award details
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    awarded_by BIGINT,
    award_reason VARCHAR(500),

    -- Related achievement
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at DATETIME,
    revoked_by BIGINT,
    revoke_reason VARCHAR(500),

    -- Display
    is_featured BOOLEAN DEFAULT FALSE, -- Show on profile

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    FOREIGN KEY (awarded_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY uk_user_badge (user_id, badge_id),

    INDEX idx_user_badge_user (user_id),
    INDEX idx_user_badge_badge (badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SKILL ENDORSEMENTS - Skill endorsements between users
-- =====================================================
CREATE TABLE skill_endorsements (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    endorser_id BIGINT NOT NULL,
    endorsee_id BIGINT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    project_id BIGINT,
    comment VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (endorser_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (endorsee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,

    UNIQUE KEY uk_endorsement (endorser_id, endorsee_id, skill_name),

    INDEX idx_endorsement_endorsee (endorsee_id),
    INDEX idx_endorsement_skill (skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default badges
INSERT INTO badges (code, name, description, icon, color, category, applicable_roles, criteria_type, criteria_config, display_order) VALUES
-- Verification badges
('VERIFIED_IDENTITY', 'Verified Identity', 'Identity verified through official documents', 'shield-check', 'blue', 'VERIFICATION', '["BUILDER","SUPPLIER"]', 'MANUAL', NULL, 1),
('VERIFIED_BUSINESS', 'Verified Business', 'Registered business verified', 'building', 'green', 'VERIFICATION', '["BUILDER","SUPPLIER"]', 'MANUAL', NULL, 2),
('LICENSED_PROFESSIONAL', 'Licensed Professional', 'Professional license verified', 'award', 'purple', 'VERIFICATION', '["BUILDER"]', 'MANUAL', NULL, 3),

-- Achievement badges - Builders
('FIRST_PROJECT', 'First Project', 'Completed first project on BuilderConnect', 'star', 'yellow', 'ACHIEVEMENT', '["BUILDER"]', 'AUTOMATIC', '{"type":"project_count","value":1}', 10),
('RISING_STAR', 'Rising Star', 'Completed 5 projects with excellent ratings', 'trending-up', 'orange', 'ACHIEVEMENT', '["BUILDER"]', 'AUTOMATIC', '{"type":"project_count","value":5,"min_rating":4.5}', 11),
('TOP_RATED', 'Top Rated', 'Maintained 4.8+ rating over 10 projects', 'trophy', 'gold', 'ACHIEVEMENT', '["BUILDER"]', 'AUTOMATIC', '{"type":"rating","min_rating":4.8,"min_projects":10}', 12),
('EXPERT_BUILDER', 'Expert Builder', 'Completed 25+ projects successfully', 'medal', 'silver', 'ACHIEVEMENT', '["BUILDER"]', 'AUTOMATIC', '{"type":"project_count","value":25}', 13),
('MASTER_CRAFTSMAN', 'Master Craftsman', 'Completed 50+ projects with excellence', 'crown', 'gold', 'ACHIEVEMENT', '["BUILDER"]', 'AUTOMATIC', '{"type":"project_count","value":50,"min_rating":4.5}', 14),

-- Achievement badges - Clients
('FIRST_HIRE', 'First Hire', 'Posted and completed first project', 'check-circle', 'blue', 'ACHIEVEMENT', '["CLIENT"]', 'AUTOMATIC', '{"type":"projects_posted","value":1}', 20),
('REGULAR_CLIENT', 'Regular Client', 'Completed 5+ projects', 'repeat', 'green', 'ACHIEVEMENT', '["CLIENT"]', 'AUTOMATIC', '{"type":"projects_posted","value":5}', 21),
('PREMIUM_CLIENT', 'Premium Client', 'Invested PKR 1M+ in projects', 'gem', 'purple', 'ACHIEVEMENT', '["CLIENT"]', 'AUTOMATIC', '{"type":"total_spent","value":1000000}', 22),

-- Milestone badges
('ON_TIME_DELIVERY', 'On Time Champion', 'Delivered 10+ projects on time', 'clock', 'green', 'MILESTONE', '["BUILDER"]', 'AUTOMATIC', '{"type":"on_time_projects","value":10}', 30),
('QUICK_RESPONDER', 'Quick Responder', 'Responds within 2 hours on average', 'zap', 'yellow', 'MILESTONE', '["BUILDER","SUPPLIER"]', 'AUTOMATIC', '{"type":"response_time","max_hours":2}', 31),

-- Loyalty badges
('MEMBER_1_YEAR', '1 Year Member', 'Active member for 1 year', 'calendar', 'blue', 'LOYALTY', '["BUILDER","CLIENT","SUPPLIER"]', 'AUTOMATIC', '{"type":"membership_days","value":365}', 40),
('MEMBER_2_YEARS', '2 Year Member', 'Active member for 2 years', 'calendar-check', 'silver', 'LOYALTY', '["BUILDER","CLIENT","SUPPLIER"]', 'AUTOMATIC', '{"type":"membership_days","value":730}', 41),

-- Special badges
('EARLY_ADOPTER', 'Early Adopter', 'Joined during platform launch', 'rocket', 'purple', 'SPECIAL', '["BUILDER","CLIENT","SUPPLIER"]', 'MANUAL', NULL, 50),
('COMMUNITY_HELPER', 'Community Helper', 'Actively helps other users', 'heart', 'red', 'SPECIAL', '["BUILDER","CLIENT"]', 'MANUAL', NULL, 51);
