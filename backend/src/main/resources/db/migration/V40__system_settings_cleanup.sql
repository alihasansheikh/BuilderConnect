-- V40: System settings cleanup.
-- Adds the maintenance banner message (editable copy behind the maintenance_mode
-- toggle) and removes the rows nothing on the platform reads: the fee is dead
-- (no fee charged anywhere post-V34) and the other keys were never consumed.

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('maintenance_message', 'BuilderConnect is undergoing scheduled maintenance. Some features may be temporarily unavailable — thank you for your patience.', 'STRING', 'Message shown in the site-wide maintenance banner', TRUE);

DELETE FROM system_settings WHERE setting_key IN (
    'platform_fee_percentage',
    'allowed_file_types',
    'notification_settings',
    'platform_currency',
    'platform_version',
    'require_email_verification'
);
