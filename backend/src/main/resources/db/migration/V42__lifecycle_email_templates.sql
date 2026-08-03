-- =====================================================
-- V42: Project lifecycle email templates
-- =====================================================
-- Templates for the work-gated milestone flow: the client rejecting a
-- completed milestone (rework requested) and both parties being told
-- the project completed once every milestone is paid.

INSERT INTO email_templates (template_key, name, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
('milestone_rejected', 'Milestone Rejected', 'Changes requested for milestone {{milestoneName}}',
 '<h2>Changes Requested</h2><p>Hi {{builderName}},</p><p>The client has requested changes on milestone <strong>{{milestoneName}}</strong> for project <strong>{{projectTitle}}</strong>:</p><p><strong>{{reason}}</strong></p><p>Please review the feedback, make the necessary changes, and mark the milestone complete again.</p>',
 '["builderName","milestoneName","projectTitle","reason"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('project_completed', 'Project Completed', 'Your project {{projectTitle}} is complete',
 '<h2>Project Completed</h2><p>Hi {{name}},</p><p>Congratulations! All milestones on <strong>{{projectTitle}}</strong> have been paid and the project is now complete.</p><p>Thank you for using BuilderConnect.</p>',
 '["name","projectTitle"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW());
