-- =====================================================
-- V38: Email template cleanup and additions
-- =====================================================
-- Adds lifecycle templates for the template-driven email sender and
-- removes templates whose flows no longer exist (bid_received,
-- bid_accepted, payment_released).

INSERT INTO email_templates (template_key, name, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
('account_suspended', 'Account Suspended', 'Your BuilderConnect account has been suspended',
 '<h2>Account Suspended</h2><p>Hi {{name}},</p><p>Your BuilderConnect account has been suspended for the following reason:</p><p><strong>{{reason}}</strong></p><p>If you believe this was a mistake, please contact our support team at support@builderconnect.pk.</p>',
 '["name","reason"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('account_unsuspended', 'Account Restored', 'Your BuilderConnect account has been restored',
 '<h2>Account Restored</h2><p>Hi {{name}},</p><p>Good news! Your BuilderConnect account has been restored. You can now log in and resume using the platform.</p><p>Thank you for your patience.</p>',
 '["name"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('builder_verified', 'Builder Verified', 'Congratulations! Your builder profile is now verified',
 '<h2>You Are Verified!</h2><p>Hi {{name}},</p><p>Congratulations! <strong>{{companyName}}</strong> has been verified on BuilderConnect.</p><p>Your profile now carries a verified badge, giving clients more confidence when awarding projects.</p>',
 '["name","companyName"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('supplier_verified', 'Supplier Verified', 'Congratulations! Your supplier profile is now verified',
 '<h2>You Are Verified!</h2><p>Hi {{name}},</p><p>Congratulations! <strong>{{companyName}}</strong> has been verified on BuilderConnect.</p><p>Your storefront now carries a verified badge, giving buyers more confidence when ordering your materials.</p>',
 '["name","companyName"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('verification_rejected', 'Verification Rejected', 'Your BuilderConnect verification request was not approved',
 '<h2>Verification Update</h2><p>Hi {{name}},</p><p>Unfortunately, your verification request was not approved for the following reason:</p><p><strong>{{reason}}</strong></p><p>You can update your details and submit a new request at any time from your dashboard.</p>',
 '["name","reason"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('subscription_receipt', 'Subscription Receipt', 'Payment received for your {{planName}} subscription',
 '<h2>Subscription Receipt</h2><p>Hi {{name}},</p><p>We have received your payment of <strong>PKR {{amount}}</strong> for the <strong>{{planName}}</strong> plan.</p><p>Your subscription is active until <strong>{{periodEnd}}</strong>.</p><p>Thank you for choosing BuilderConnect!</p>',
 '["name","planName","amount","periodEnd"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('milestone_payment_marked', 'Milestone Payment Marked', 'Payment marked for milestone {{milestoneName}}',
 '<h2>Milestone Payment Marked</h2><p>Hi {{builderName}},</p><p>The client has marked a payment of <strong>PKR {{amount}}</strong> for milestone <strong>{{milestoneName}}</strong> on project <strong>{{projectTitle}}</strong>.</p><p>Please review the payment proof and confirm receipt from your dashboard.</p>',
 '["builderName","milestoneName","projectTitle","amount"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('milestone_payment_confirmed', 'Milestone Payment Confirmed', 'Payment confirmed for milestone {{milestoneName}}',
 '<h2>Milestone Payment Confirmed</h2><p>Hi {{clientName}},</p><p>The builder has confirmed receipt of your payment for milestone <strong>{{milestoneName}}</strong> on project <strong>{{projectTitle}}</strong>.</p><p>The project can now move on to the next stage.</p>',
 '["clientName","milestoneName","projectTitle"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('team_welcome', 'Team Member Welcome', 'Welcome to the BuilderConnect team',
 '<h2>Welcome Aboard!</h2><p>Hi {{name}},</p><p>An account has been created for you on BuilderConnect with the role of <strong>{{role}}</strong>.</p><p>Please log in with the credentials shared with you and change your password from your account settings.</p>',
 '["name","role"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW());

DELETE FROM email_templates WHERE template_key IN ('bid_received', 'bid_accepted', 'payment_released');
