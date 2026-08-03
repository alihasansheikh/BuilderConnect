-- =====================================================
-- V44: Support loop email templates
-- =====================================================
-- Owner-facing ticket emails (agent reply, resolution) and the
-- dispute-filed notice sent to the respondent.

INSERT INTO email_templates (template_key, name, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
('ticket_response', 'Ticket Response (Owner)', 'New reply on your ticket {{ticketNumber}}',
 '<h2>Support Replied</h2><p>Hi {{name}},</p><p>Our support team has replied to your ticket <strong>{{ticketNumber}}</strong> ({{subject}}).</p><p>Please log in to your BuilderConnect account to read the reply and respond.</p>',
 '["name","ticketNumber","subject"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('ticket_resolved', 'Ticket Resolved (Owner)', 'Your ticket {{ticketNumber}} has been resolved',
 '<h2>Ticket Resolved</h2><p>Hi {{name}},</p><p>Your ticket <strong>{{ticketNumber}}</strong> ({{subject}}) has been resolved.</p><p><strong>Resolution:</strong> {{resolution}}</p><p>If this does not solve your problem, you can reopen the ticket from your BuilderConnect account.</p>',
 '["name","ticketNumber","subject","resolution"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('dispute_filed', 'Dispute Filed (Respondent)', 'A dispute has been filed on {{projectTitle}}',
 '<h2>Dispute Filed</h2><p>Hi {{name}},</p><p>Dispute <strong>{{disputeNumber}}</strong> has been filed against you on project <strong>{{projectTitle}}</strong>.</p><p>Our support team will review the case. Please log in to your BuilderConnect account to view the dispute and respond.</p>',
 '["name","disputeNumber","projectTitle"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW());
