-- V14: CMS tables for pages, blog posts, and email templates

-- Static pages (About, Terms of Service, Privacy Policy, etc.)
CREATE TABLE IF NOT EXISTS cms_pages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(200) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    meta_description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(300) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    excerpt VARCHAR(500),
    content TEXT NOT NULL,
    cover_image_url VARCHAR(500),
    category VARCHAR(100),
    tags JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    view_count INT NOT NULL DEFAULT 0,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Seed default email templates
INSERT INTO email_templates (template_key, name, subject, body, variables) VALUES
('welcome', 'Welcome Email', 'Welcome to BuilderConnect!', '<h1>Welcome, {{name}}!</h1><p>Thank you for joining BuilderConnect.</p>', '["name", "email"]'),
('bid_received', 'Bid Received', 'New Bid on Your Project', '<p>Hi {{clientName}},</p><p>You received a new bid of PKR {{amount}} on "{{projectTitle}}".</p>', '["clientName", "amount", "projectTitle"]'),
('project_awarded', 'Project Awarded', 'Congratulations! Project Awarded', '<p>Hi {{builderName}},</p><p>You have been awarded the project "{{projectTitle}}".</p>', '["builderName", "projectTitle"]'),
('payment_released', 'Payment Released', 'Payment Released for {{milestoneName}}', '<p>Hi {{builderName}},</p><p>A payment of PKR {{amount}} has been released for milestone "{{milestoneName}}".</p>', '["builderName", "amount", "milestoneName"]'),
('password_reset', 'Password Reset', 'Reset Your Password', '<p>Hi {{name}},</p><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>', '["name", "resetLink"]');
