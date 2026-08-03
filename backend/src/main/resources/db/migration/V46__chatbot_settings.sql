-- Public FAQ chatbot kill-switch. Admin-editable (System Settings page) and
-- exposed via GET /v1/public/settings so the widget can hide itself when off.
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES ('chatbot_enabled', 'true', 'BOOLEAN', 'Enable the public FAQ chatbot on the marketing pages', TRUE);
