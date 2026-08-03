-- V16: Comprehensive Seed Data - Fill all tables with realistic demo data
-- BuilderConnect v2 - Construction Project Management Platform
-- This migration populates every table that was left empty by V10

-- =====================================================
-- 1. CONTRACTS - For the awarded project (PRJ-2026-00004)
-- =====================================================
INSERT INTO contracts (contract_number, project_id, client_id, builder_id, total_amount, payment_terms, scope_of_work, terms_and_conditions, special_clauses, start_date, end_date, status, client_signed_at, client_ip_address, builder_signed_at, builder_ip_address, created_at) VALUES
('CTR-2026-00001',
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 18500000,
 'Milestone-based payments. Each milestone payment released within 7 days of approval. 20% advance for foundation work held in escrow.',
 'Complete construction of 1-kanal residential house including:\n1. Foundation and basement parking\n2. Ground floor - 3 bedrooms, 3 bathrooms, kitchen, lounge\n3. First floor - 2 bedrooms, 3 bathrooms, family room\n4. MEP (Mechanical, Electrical, Plumbing)\n5. Interior finishing with premium materials\n6. Boundary walls and landscaping',
 'Standard BuilderConnect Terms v2.0:\n- Builder must maintain valid insurance throughout project\n- Client to provide timely access to construction site\n- Changes to scope require written change request approval\n- Disputes handled through BuilderConnect mediation\n- Payment held in escrow until milestone approval',
 'Builder shall use Amreli Steel for all reinforcement.\nDG Cement or Lucky Cement only.\nAll electrical work to comply with WAPDA standards.\nMinimum 6 months warranty on all finishing work.',
 '2026-01-15', '2026-12-31', 'ACTIVE',
 DATEADD('DAY', -45, NOW()), '192.168.1.10',
 DATEADD('DAY', -45, NOW()), '192.168.1.25',
 DATEADD('DAY', -46, NOW()));

-- =====================================================
-- 2. CONTRACT VERSIONS
-- =====================================================
INSERT INTO contract_versions (contract_id, version_number, scope_of_work, terms_and_conditions, total_amount, start_date, end_date, change_summary, created_by, created_at) VALUES
((SELECT id FROM contracts WHERE contract_number = 'CTR-2026-00001'), 1,
 'Complete construction of 1-kanal residential house - original scope',
 'Standard BuilderConnect Terms v2.0', 18500000, '2026-01-15', '2026-12-31',
 'Initial contract version',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 DATEADD('DAY', -46, NOW()));

-- =====================================================
-- 3. ESCROW TRANSACTIONS
-- =====================================================
INSERT INTO escrow_transactions (escrow_account_id, transaction_reference, transaction_type, amount, fee_amount, net_amount, balance_before, balance_after, milestone_id, description, status, payment_provider, initiated_by, completed_at, created_at) VALUES
((SELECT id FROM escrow_accounts WHERE project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 'ESC-TXN-2026-00001', 'FUND', 3000000, 30000, 2970000, 0, 3000000, NULL,
 'Initial escrow funding - Phase 1', 'COMPLETED', 'MOCK',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 DATEADD('DAY', -44, NOW()), DATEADD('DAY', -44, NOW())),

((SELECT id FROM escrow_accounts WHERE project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 'ESC-TXN-2026-00002', 'FUND', 2000000, 20000, 1980000, 3000000, 5000000, NULL,
 'Additional escrow funding - Phase 2', 'COMPLETED', 'MOCK',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW()));

-- =====================================================
-- 4. PAYMENTS
-- =====================================================
INSERT INTO payments (payment_reference, payer_id, payee_id, project_id, payment_type, amount, fee_amount, net_amount, currency, payment_method, status, initiated_at, completed_at, created_at) VALUES
('PAY-2026-00001',
 (SELECT id FROM users WHERE email = 'client3@example.com'), NULL,
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 'ESCROW_FUND', 3000000, 30000, 2970000, 'PKR', 'MOCK', 'COMPLETED',
 DATEADD('DAY', -44, NOW()), DATEADD('DAY', -44, NOW()), DATEADD('DAY', -44, NOW())),

('PAY-2026-00002',
 (SELECT id FROM users WHERE email = 'client3@example.com'), NULL,
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 'ESCROW_FUND', 2000000, 20000, 1980000, 'PKR', 'MOCK', 'COMPLETED',
 DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW())),

('PAY-2026-00003',
 (SELECT id FROM users WHERE email = 'client1@example.com'), NULL,
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'),
 'ESCROW_FUND', 200000, 2000, 198000, 'PKR', 'MOCK', 'COMPLETED',
 DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

-- Lead credit purchase by builder
('PAY-2026-00004',
 (SELECT id FROM users WHERE email = 'builder1@example.com'), NULL, NULL,
 'LEAD_CREDIT_PURCHASE', 2999, 0, 2999, 'PKR', 'MOCK', 'COMPLETED',
 DATEADD('DAY', -20, NOW()), DATEADD('DAY', -20, NOW()), DATEADD('DAY', -20, NOW())),

('PAY-2026-00005',
 (SELECT id FROM users WHERE email = 'builder2@example.com'), NULL, NULL,
 'SUBSCRIPTION', 7999, 0, 7999, 'PKR', 'MOCK', 'COMPLETED',
 DATEADD('DAY', -15, NOW()), DATEADD('DAY', -15, NOW()), DATEADD('DAY', -15, NOW()));

-- =====================================================
-- 5. INVOICES
-- =====================================================
INSERT INTO invoices (invoice_number, issued_to, issued_by, project_id, payment_id, invoice_type, subtotal, tax_amount, discount_amount, total_amount, currency, line_items, issue_date, due_date, paid_date, status, notes, created_at) VALUES
('INV-2026-00001',
 (SELECT id FROM users WHERE email = 'client3@example.com'), NULL,
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM payments WHERE payment_reference = 'PAY-2026-00001'),
 'PROJECT', 3000000, 0, 0, 3000000, 'PKR',
 '[{"description":"Escrow Fund - New House Construction Phase 1","quantity":1,"unitPrice":3000000,"total":3000000}]',
 DATEADD('DAY', -44, NOW()), DATEADD('DAY', -37, NOW()), DATEADD('DAY', -44, NOW()),
 'PAID', 'Initial escrow deposit for project PRJ-2026-00004', DATEADD('DAY', -44, NOW())),

('INV-2026-00002',
 (SELECT id FROM users WHERE email = 'client3@example.com'), NULL,
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM payments WHERE payment_reference = 'PAY-2026-00002'),
 'PROJECT', 2000000, 0, 0, 2000000, 'PKR',
 '[{"description":"Escrow Fund - New House Construction Phase 2","quantity":1,"unitPrice":2000000,"total":2000000}]',
 DATEADD('DAY', -30, NOW()), DATEADD('DAY', -23, NOW()), DATEADD('DAY', -30, NOW()),
 'PAID', 'Second escrow deposit for project PRJ-2026-00004', DATEADD('DAY', -30, NOW())),

('INV-2026-00003',
 (SELECT id FROM users WHERE email = 'builder1@example.com'), NULL, NULL,
 (SELECT id FROM payments WHERE payment_reference = 'PAY-2026-00004'),
 'SUBSCRIPTION', 2999, 0, 0, 2999, 'PKR',
 '[{"description":"Lead Credit Package - Basic Plan","quantity":1,"unitPrice":2999,"total":2999}]',
 DATEADD('DAY', -20, NOW()), DATEADD('DAY', -13, NOW()), DATEADD('DAY', -20, NOW()),
 'PAID', 'Lead credit purchase', DATEADD('DAY', -20, NOW()));

-- =====================================================
-- 6. MILESTONE UPDATES (progress on the in-progress milestone)
-- =====================================================
INSERT INTO milestone_updates (milestone_id, created_by, update_type, message, progress_percentage, attachments, created_at) VALUES
((SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'PROGRESS', 'Excavation work started. Soil testing completed - ground is suitable for raft foundation.', 15, NULL,
 DATEADD('DAY', -40, NOW())),

((SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'PROGRESS', 'Excavation complete. Footings layout marked as per structural drawings. Steel reinforcement being prepared.', 35, NULL,
 DATEADD('DAY', -30, NOW())),

((SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'PHOTO', 'Foundation footings poured and curing in progress. Photos attached.', 50, '["https://example.com/photos/foundation-1.jpg","https://example.com/photos/foundation-2.jpg"]',
 DATEADD('DAY', -20, NOW())),

((SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'ISSUE', 'Minor delay due to unexpected rain for 3 days. Work has resumed. Adjusting timeline by 5 days.', 55, NULL,
 DATEADD('DAY', -12, NOW())),

((SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'PROGRESS', 'Basement slab reinforcement in progress. Waterproofing membrane applied to exterior walls.', 70, NULL,
 DATEADD('DAY', -5, NOW()));

-- Update the milestone progress
UPDATE milestones SET progress_percentage = 70
WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004');

-- =====================================================
-- 7. CHAT ROOMS
-- =====================================================
-- Project chat for awarded project
INSERT INTO chat_rooms (room_code, room_type, project_id, name, description, created_by, is_active, last_message_at, last_message_preview, created_at, updated_at) VALUES
('PROJ-CHAT-00004', 'PROJECT',
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 'New House Construction - Project Chat',
 'Project discussion for 1-kanal house construction in F-7/2, Islamabad',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 TRUE, NOW(), 'Waterproofing membrane applied successfully', DATEADD('DAY', -44, NOW()), DATEADD('DAY', -44, NOW())),

-- Bid discussion
('BID-CHAT-00001', 'BID',
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'),
 'Kitchen Renovation - Bid Discussion',
 'Discussion for bids on Kitchen Renovation project',
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 TRUE, NOW(), 'We can start next week if approved', DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

-- Direct message between client and builder
('DM-001', 'DIRECT', NULL,
 'Ahmed Khan & Prime Constructors',
 'Direct message between client and builder',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 TRUE, NOW(), 'Thanks for the update!', DATEADD('DAY', -44, NOW()), DATEADD('DAY', -44, NOW())),

-- Support chat
('SUPPORT-001', 'SUPPORT', NULL,
 'Support: Ahmed Khan - Payment Query',
 'Support ticket discussion',
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 TRUE, DATEADD('DAY', -3, NOW()), 'Your issue has been resolved', DATEADD('DAY', -7, NOW()), DATEADD('DAY', -7, NOW()));

-- =====================================================
-- 8. CHAT ROOM PARTICIPANTS
-- =====================================================
INSERT INTO chat_room_participants (chat_room_id, user_id, joined_at, last_read_at, role, is_active) VALUES
-- Project chat participants
((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'), (SELECT id FROM users WHERE email = 'client3@example.com'), DATEADD('DAY', -44, NOW()), NOW(), 'OWNER', TRUE),
((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'), (SELECT id FROM users WHERE email = 'builder4@example.com'), DATEADD('DAY', -44, NOW()), NOW(), 'MEMBER', TRUE),

-- Bid chat participants
((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'), (SELECT id FROM users WHERE email = 'client1@example.com'), DATEADD('DAY', -10, NOW()), NOW(), 'OWNER', TRUE),
((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'), (SELECT id FROM users WHERE email = 'builder1@example.com'), DATEADD('DAY', -10, NOW()), NOW(), 'MEMBER', TRUE),

-- DM participants
((SELECT id FROM chat_rooms WHERE room_code = 'DM-001'), (SELECT id FROM users WHERE email = 'client3@example.com'), DATEADD('DAY', -44, NOW()), NOW(), 'MEMBER', TRUE),
((SELECT id FROM chat_rooms WHERE room_code = 'DM-001'), (SELECT id FROM users WHERE email = 'builder4@example.com'), DATEADD('DAY', -44, NOW()), NOW(), 'MEMBER', TRUE),

-- Support chat participants
((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'), (SELECT id FROM users WHERE email = 'client1@example.com'), DATEADD('DAY', -7, NOW()), DATEADD('DAY', -3, NOW()), 'MEMBER', TRUE),
((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'), (SELECT id FROM users WHERE email = 'support@builderconnect.pk'), DATEADD('DAY', -7, NOW()), DATEADD('DAY', -3, NOW()), 'ADMIN', TRUE);

-- =====================================================
-- 9. CHAT MESSAGES
-- =====================================================
INSERT INTO chat_messages (chat_room_id, sender_id, message_type, content, created_at) VALUES
-- Project chat messages
((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'TEXT', 'Welcome to the project chat! Looking forward to seeing the construction progress.',
 DATEADD('DAY', -44, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'TEXT', 'Thank you! We will start excavation work tomorrow morning. The team is ready.',
 DATEADD('DAY', -43, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'MILESTONE_UPDATE', 'Milestone Update: Foundation Work - Excavation started. Soil testing reveals good bearing capacity.',
 DATEADD('DAY', -40, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'TEXT', 'Great to hear! Can you share some photos of the progress?',
 DATEADD('DAY', -34, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'IMAGE', 'Here are photos from today - footings poured and curing.',
 DATEADD('DAY', -20, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'PROJ-CHAT-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'TEXT', 'Waterproofing membrane applied successfully. Moving to basement slab next week.',
 DATEADD('DAY', -5, NOW())),

-- Bid chat messages
((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'TEXT', 'Hi, I have a few questions about your bid for the kitchen renovation.',
 DATEADD('DAY', -10, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'),
 (SELECT id FROM users WHERE email = 'builder1@example.com'),
 'TEXT', 'Of course! Please ask away. Happy to clarify any details.',
 DATEADD('DAY', -10, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'TEXT', 'What brand of cabinets are you proposing? And can you use Italian marble for countertops?',
 DATEADD('DAY', -9, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'BID-CHAT-00001'),
 (SELECT id FROM users WHERE email = 'builder1@example.com'),
 'TEXT', 'We use Master Molty Go cabinets - premium quality. Italian marble is possible but would add about PKR 50,000 to the budget. We can start next week if approved.',
 DATEADD('DAY', -9, NOW())),

-- DM messages
((SELECT id FROM chat_rooms WHERE room_code = 'DM-001'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'TEXT', 'Hi, just checking - how is the foundation work coming along?',
 DATEADD('DAY', -15, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'DM-001'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'TEXT', 'Curing is on schedule. I will share progress photos tomorrow.',
 DATEADD('DAY', -15, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'DM-001'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'TEXT', 'Thanks for the update!',
 DATEADD('DAY', -14, NOW())),

-- Support chat messages
((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'TEXT', 'Hi, I made an escrow payment but it is showing as pending since 2 days. Can you check?',
 DATEADD('DAY', -7, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'TEXT', 'Hi Ahmed, let me check your payment status. Can you share the payment reference number?',
 DATEADD('DAY', -7, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'TEXT', 'It is PAY-2026-00003.',
 DATEADD('DAY', -6, NOW())),

((SELECT id FROM chat_rooms WHERE room_code = 'SUPPORT-001'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'TEXT', 'I can see the payment was processed successfully. The status has been updated. Your issue has been resolved.',
 DATEADD('DAY', -3, NOW()));

-- =====================================================
-- 10. CHANGE REQUESTS
-- =====================================================
INSERT INTO change_requests (project_id, requested_by, change_type, title, description, proposed_value, current_value, status, reviewed_by, reviewed_at, created_at, updated_at) VALUES
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'SCOPE', 'Add smart home wiring',
 'Would like to add smart home wiring infrastructure (Cat6 cabling, smart switch points, CCTV conduits) throughout the house during the MEP phase.',
 'Include Cat6 cabling to all rooms, 8 CCTV points, smart switch infrastructure',
 'Standard electrical wiring only',
 'APPROVED',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 DATEADD('DAY', -25, NOW()),
 DATEADD('DAY', -28, NOW()), DATEADD('DAY', -28, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'TIMELINE', 'Extension due to rain delays',
 'Requesting 10-day extension due to unexpected heavy rainfall that halted work for 5 days and required 5 additional days for ground to dry.',
 'New end date: 2027-01-10',
 'Original end date: 2026-12-31',
 'APPROVED',
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 DATEADD('DAY', -10, NOW()),
 DATEADD('DAY', -12, NOW()), DATEADD('DAY', -12, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'BUDGET', 'Budget increase for premium fixtures',
 'Want to upgrade all bathroom fixtures to Kohler premium range and kitchen appliances to Bosch built-in series.',
 'PKR 19,800,000 (increase of PKR 1,300,000)',
 'PKR 18,500,000',
 'PENDING', NULL, NULL,
 DATEADD('DAY', -3, NOW()), DATEADD('DAY', -3, NOW()));

-- =====================================================
-- 11. PROJECT ATTACHMENTS
-- =====================================================
INSERT INTO project_attachments (project_id, uploaded_by, file_name, file_url, file_type, file_size, description, attachment_type, created_at) VALUES
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'house_design_blueprint.pdf', 'https://example.com/files/blueprint.pdf', 'application/pdf', 2500000,
 'Architectural blueprint - approved design', 'DESIGN', DATEADD('DAY', -50, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'client3@example.com'),
 'structural_drawings.pdf', 'https://example.com/files/structural.pdf', 'application/pdf', 1800000,
 'Structural engineering drawings', 'DESIGN', DATEADD('DAY', -50, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'foundation_progress_01.jpg', 'https://example.com/files/foundation1.jpg', 'image/jpeg', 450000,
 'Foundation excavation complete', 'PROGRESS', DATEADD('DAY', -30, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 'foundation_progress_02.jpg', 'https://example.com/files/foundation2.jpg', 'image/jpeg', 520000,
 'Footings poured', 'PROGRESS', DATEADD('DAY', -20, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'kitchen_reference_photos.zip', 'https://example.com/files/kitchen_ref.zip', 'application/zip', 8500000,
 'Reference photos for desired kitchen design', 'REQUIREMENT', DATEADD('DAY', -10, NOW())),

((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'kitchen_measurements.pdf', 'https://example.com/files/kitchen_measure.pdf', 'application/pdf', 350000,
 'Current kitchen dimensions and layout', 'REQUIREMENT', DATEADD('DAY', -10, NOW()));

-- =====================================================
-- 12. ANNOUNCEMENTS
-- =====================================================
INSERT INTO announcements (title, content, announcement_type, target_roles, target_cities, is_active, is_dismissible, display_position, start_date, end_date, view_count, click_count, created_by, created_at, updated_at) VALUES
('Welcome to BuilderConnect 2.0!', 'We are excited to launch our upgraded platform with new features including escrow payments, milestone tracking, and real-time chat. Explore all the new capabilities!', 'UPDATE', '["CLIENT","BUILDER","SUPPLIER"]', NULL, TRUE, TRUE, 'DASHBOARD', DATEADD('DAY', -60, NOW()), DATEADD('DAY', 30, NOW()), 245, 89, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -60, NOW()), DATEADD('DAY', -60, NOW())),

('Scheduled Maintenance - March 5', 'BuilderConnect will undergo scheduled maintenance on March 5, 2026 from 2:00 AM to 6:00 AM PST. The platform may be temporarily unavailable during this time.', 'MAINTENANCE', '["CLIENT","BUILDER","SUPPLIER","ADMIN"]', NULL, TRUE, FALSE, 'TOP_BANNER', DATEADD('DAY', 3, NOW()), DATEADD('DAY', 7, NOW()), 0, 0, (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), DATEADD('DAY', -1, NOW()), DATEADD('DAY', -1, NOW())),

('Special Offer: 50% Off Professional Plan!', 'Upgrade to Professional plan this month and get 50% off for the first 3 months. Use code BUILDPRO50 at checkout. Limited time offer!', 'PROMOTION', '["BUILDER"]', NULL, TRUE, TRUE, 'DASHBOARD', DATEADD('DAY', -10, NOW()), DATEADD('DAY', 20, NOW()), 78, 34, (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

('Karachi Builders: Register for Free Workshop', 'Free construction best practices workshop on March 15 at PCATP Karachi. Limited seats - register now!', 'INFO', '["BUILDER"]', '["Karachi"]', TRUE, TRUE, 'SIDEBAR', DATEADD('DAY', -5, NOW()), DATEADD('DAY', 15, NOW()), 42, 18, (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), DATEADD('DAY', -5, NOW()), DATEADD('DAY', -5, NOW()));

-- =====================================================
-- 13. EMAIL TEMPLATES
-- =====================================================
-- Only add templates not already seeded in V14 (welcome, bid_received, project_awarded, payment_released, password_reset)
INSERT INTO email_templates (template_key, name, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
('email_verification', 'Email Verification', 'Verify your BuilderConnect email',
 '<h2>Email Verification</h2><p>Hi {{name}},</p><p>Please click the link below to verify your email address:</p><p><a href="{{verificationUrl}}">Verify Email</a></p><p>This link will expire in 24 hours.</p><p>If you did not create this account, please ignore this email.</p>',
 '["name","verificationUrl"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('new_bid_notification', 'New Bid Notification', 'New bid received for {{projectTitle}}',
 '<h2>New Bid Received!</h2><p>Hi {{clientName}},</p><p>A new bid has been submitted for your project <strong>{{projectTitle}}</strong>.</p><p><strong>Builder:</strong> {{builderName}}<br/><strong>Amount:</strong> PKR {{bidAmount}}<br/><strong>Duration:</strong> {{duration}} days</p><p><a href="{{bidUrl}}">View Bid Details</a></p>',
 '["clientName","projectTitle","builderName","bidAmount","duration","bidUrl"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('bid_accepted', 'Bid Accepted', 'Congratulations! Your bid for {{projectTitle}} was accepted',
 '<h2>Bid Accepted!</h2><p>Hi {{builderName}},</p><p>Great news! Your bid for <strong>{{projectTitle}}</strong> has been accepted.</p><p><strong>Amount:</strong> PKR {{bidAmount}}<br/><strong>Start Date:</strong> {{startDate}}</p><p>Please proceed to sign the contract.</p><p><a href="{{contractUrl}}">View Contract</a></p>',
 '["builderName","projectTitle","bidAmount","startDate","contractUrl"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('milestone_completed', 'Milestone Completed', 'Milestone "{{milestoneTitle}}" completed - Review required',
 '<h2>Milestone Completed</h2><p>Hi {{clientName}},</p><p>The builder has marked milestone <strong>{{milestoneTitle}}</strong> as completed for project <strong>{{projectTitle}}</strong>.</p><p>Please review the deliverables and approve/reject the milestone to proceed with payment release.</p><p><a href="{{milestoneUrl}}">Review Milestone</a></p>',
 '["clientName","milestoneTitle","projectTitle","milestoneUrl"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW()));

-- =====================================================
-- 14. CMS PAGES
-- =====================================================
INSERT INTO cms_pages (slug, title, content, meta_description, status, is_published, published_at, created_by, created_at, updated_at) VALUES
('about', 'About BuilderConnect', '<h1>About BuilderConnect</h1><p>BuilderConnect is Pakistan''s premier online platform connecting homeowners with verified construction professionals.</p><h2>Our Mission</h2><p>To simplify and secure the construction process by providing a transparent marketplace where clients can find trusted builders, and builders can grow their business.</p><h2>What We Offer</h2><ul><li>Verified builder profiles with ratings and reviews</li><li>Milestone-based direct payments with proof on record</li><li>Milestone-based project tracking</li><li>Real-time communication tools</li></ul><h2>Our Story</h2><p>Founded in 2025, BuilderConnect was born from the frustration of navigating Pakistan''s fragmented construction industry. Our founders experienced firsthand the challenges of finding reliable contractors, managing payments, and tracking progress.</p>', 'BuilderConnect - Pakistan''s premier construction project management platform connecting clients with verified builders.', 'PUBLISHED', TRUE, DATEADD('DAY', -90, NOW()), (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('terms', 'Terms of Service', '<h1>Terms of Service</h1><p>Last updated: January 1, 2026</p><h2>1. Acceptance of Terms</h2><p>By accessing and using BuilderConnect, you agree to be bound by these Terms of Service.</p><h2>2. User Accounts</h2><p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.</p><h2>3. Milestone Payments</h2><p>Projects are paid milestone by milestone. The client marks each milestone paid with proof of payment, and the builder confirms receipt before the next stage begins.</p><h2>4. Dispute Resolution</h2><p>Any disputes between clients and builders will first be mediated through our platform. If unresolved, disputes will be handled under the laws of Pakistan.</p><h2>5. Subscriptions</h2><p>BuilderConnect is free for clients. Builders may subscribe to paid plans for more lead credits, higher bid limits, and featured placement; subscriptions are billed securely through Stripe.</p>', 'BuilderConnect Terms of Service - User agreements, payment terms, and platform policies.', 'PUBLISHED', TRUE, DATEADD('DAY', -90, NOW()), (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('privacy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Last updated: January 1, 2026</p><h2>1. Information We Collect</h2><p>We collect information you provide directly: name, email, phone number, address, and business registration details.</p><h2>2. How We Use Your Information</h2><p>We use your information to provide platform services, process payments, facilitate communication, and improve our services.</p><h2>3. Data Security</h2><p>We employ industry-standard security measures including encryption, secure servers, and regular security audits to protect your data.</p><h2>4. Data Sharing</h2><p>We do not sell your data. We share limited information with other users only as necessary for project execution (e.g., sharing builder contact info with matched clients).</p>', 'BuilderConnect Privacy Policy - How we collect, use, and protect your personal information.', 'PUBLISHED', TRUE, DATEADD('DAY', -90, NOW()), (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

('faq', 'Frequently Asked Questions', '<h1>Frequently Asked Questions</h1><h2>For Clients</h2><h3>How do I post a project?</h3><p>Navigate to your dashboard and click "Post New Project". Fill in the details, budget range, and required skills.</p><h3>How do milestone payments work?</h3><p>You pay each milestone directly and upload proof of payment. The builder confirms receipt, and the project advances to the next milestone.</p><h3>What if I am not satisfied with the work?</h3><p>You can raise a dispute through the platform. Our mediation team will review the case and help reach a resolution.</p><h2>For Builders</h2><h3>How do I get more leads?</h3><p>Upgrade your subscription plan for more lead credits, featured listings, and priority placement in search results.</p><h3>When do I get paid?</h3><p>The client pays you directly for each milestone and uploads proof; you confirm receipt in the app to advance the project.</p><h3>How do I get verified?</h3><p>Submit your CNIC, business registration certificate, and other documents through the verification portal. Our team verifies within 3-5 business days.</p>', 'BuilderConnect FAQ - Answers to common questions about projects, payments, and platform features.', 'PUBLISHED', TRUE, DATEADD('DAY', -90, NOW()), (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW()));

-- =====================================================
-- 15. BLOG POSTS
-- =====================================================
INSERT INTO blog_posts (slug, title, excerpt, content, cover_image_url, category, tags, status, is_published, published_at, view_count, created_by, created_at, updated_at) VALUES
('top-10-tips-hiring-contractor-pakistan', 'Top 10 Tips for Hiring a Contractor in Pakistan', 'Finding the right contractor can make or break your construction project. Here are 10 essential tips to help you make the right choice.',
 '<h1>Top 10 Tips for Hiring a Contractor in Pakistan</h1><p>Building your dream home or renovating your space is exciting, but choosing the wrong contractor can turn it into a nightmare. Here are our top 10 tips:</p><h2>1. Check Credentials</h2><p>Verify the contractor''s registration with PEC (Pakistan Engineering Council) and check their business license.</p><h2>2. Review Past Work</h2><p>Ask for a portfolio and visit completed projects if possible. Photos don''t always tell the full story.</p><h2>3. Get Multiple Bids</h2><p>Always get at least 3 competitive bids. This helps you understand market rates and compare approaches.</p><h2>4. Read Reviews</h2><p>Check reviews on BuilderConnect and ask for client references. Look for patterns in feedback.</p><h2>5. Understand the Contract</h2><p>Never start work without a written contract. It should clearly state scope, timeline, payment terms, and warranty.</p><h2>6. Use Escrow Payments</h2><p>Protect your investment with milestone-based escrow payments. Never pay the full amount upfront.</p><h2>7. Verify Insurance</h2><p>Ensure the contractor has liability insurance to cover accidents or damage during construction.</p><h2>8. Set Clear Milestones</h2><p>Break the project into clear milestones with specific deliverables and payment schedules.</p><h2>9. Communication is Key</h2><p>Choose a contractor who communicates regularly and is responsive to your questions.</p><h2>10. Get Everything in Writing</h2><p>Any changes to scope, timeline, or budget should be documented through formal change requests.</p>',
 'https://example.com/blog/hiring-contractor.jpg', 'Tips & Guides',
 '["construction","contractor","hiring","tips","pakistan"]',
 'PUBLISHED', TRUE, DATEADD('DAY', -45, NOW()), 1250,
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 DATEADD('DAY', -45, NOW()), DATEADD('DAY', -45, NOW())),

('understanding-construction-costs-2026', 'Understanding Construction Costs in Pakistan (2026)', 'A comprehensive guide to current construction costs per square foot in major Pakistani cities.',
 '<h1>Understanding Construction Costs in Pakistan (2026)</h1><p>Construction costs in Pakistan have seen significant changes in 2026. Here''s a detailed breakdown to help you plan your budget.</p><h2>Average Cost Per Square Foot</h2><table><tr><th>City</th><th>Grey Structure</th><th>Semi-Finished</th><th>Fully Finished</th></tr><tr><td>Karachi</td><td>PKR 2,500-3,500</td><td>PKR 4,000-5,500</td><td>PKR 6,000-9,000</td></tr><tr><td>Lahore</td><td>PKR 2,200-3,200</td><td>PKR 3,800-5,200</td><td>PKR 5,500-8,500</td></tr><tr><td>Islamabad</td><td>PKR 2,800-3,800</td><td>PKR 4,500-6,000</td><td>PKR 7,000-10,000</td></tr></table><h2>Key Cost Factors</h2><ul><li>Location and land preparation</li><li>Material quality and brand choices</li><li>Design complexity</li><li>Labor rates in your city</li><li>Finishing level desired</li></ul>',
 'https://example.com/blog/construction-costs.jpg', 'Industry Insights',
 '["construction-costs","budget","pakistan","2026","pricing"]',
 'PUBLISHED', TRUE, DATEADD('DAY', -30, NOW()), 890,
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW())),

('escrow-payments-protect-your-investment', 'How Escrow Payments Protect Your Investment', 'Learn how BuilderConnect''s escrow system keeps your money safe during construction projects.',
 '<h1>How Escrow Payments Protect Your Investment</h1><p>One of the biggest fears in construction is paying for work that doesn''t get done properly. BuilderConnect''s escrow system eliminates this risk.</p><h2>How It Works</h2><ol><li>Client deposits funds into a secure escrow account</li><li>Builder completes milestone work</li><li>Client reviews and approves the milestone</li><li>Funds are released to the builder</li></ol><h2>Benefits for Clients</h2><ul><li>Money is safe until work is approved</li><li>Milestone-based releases reduce risk</li><li>Dispute resolution available if needed</li></ul><h2>Benefits for Builders</h2><ul><li>Guaranteed payment upon completion</li><li>No more chasing payments</li><li>Professional payment history builds trust</li></ul>',
 'https://example.com/blog/escrow-guide.jpg', 'Platform Features',
 '["escrow","payments","security","milestone"]',
 'PUBLISHED', TRUE, DATEADD('DAY', -15, NOW()), 456,
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 DATEADD('DAY', -15, NOW()), DATEADD('DAY', -15, NOW()));

-- =====================================================
-- 16. SYSTEM SETTINGS
-- =====================================================
-- Only add settings not already seeded in V9
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public, updated_by, created_at, updated_at) VALUES
('platform_version', '2.0.0', 'STRING', 'Current platform version', TRUE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('platform_currency', 'PKR', 'STRING', 'Default currency for the platform', TRUE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('require_email_verification', 'true', 'BOOLEAN', 'Require email verification for new accounts', FALSE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('max_project_images', '20', 'NUMBER', 'Maximum number of images per project', FALSE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('support_phone', '+92-21-111-BUILD', 'STRING', 'Support phone number', TRUE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('allowed_file_types', '{"types":["pdf","jpg","jpeg","png","doc","docx","xls","xlsx","zip"]}', 'JSON', 'Allowed file upload types', FALSE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),
('notification_settings', '{"email_enabled":true,"push_enabled":false,"digest_frequency":"daily"}', 'JSON', 'Default notification settings', FALSE, (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'), DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW()));

-- =====================================================
-- 17. LEAD TRANSACTIONS
-- =====================================================
INSERT INTO lead_transactions (builder_profile_id, transaction_type, amount, balance_after, reference_type, reference_id, description, created_at) VALUES
-- Builder 1 (Muhammad Contractors) - Professional plan, 50 credits
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder1@example.com')),
 'SUBSCRIPTION_RENEWAL', 50, 50, 'subscription', NULL, 'Monthly subscription renewal - Professional plan', DATEADD('DAY', -30, NOW())),
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder1@example.com')),
 'DEBIT', -1, 49, 'bid', NULL, 'Lead credit used for bid on Kitchen Renovation', DATEADD('DAY', -20, NOW())),
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder1@example.com')),
 'DEBIT', -1, 48, 'bid', NULL, 'Lead credit used for bid on Bathroom Upgrade', DATEADD('DAY', -18, NOW())),

-- Builder 2 (Ali Construction) - Basic plan, 25 credits
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder2@example.com')),
 'SUBSCRIPTION_RENEWAL', 20, 25, 'subscription', NULL, 'Monthly subscription renewal - Basic plan', DATEADD('DAY', -30, NOW())),

-- Builder 3 (Pak Builders) - Free plan, 5 credits
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder3@example.com')),
 'CREDIT', 5, 5, 'signup', NULL, 'Welcome bonus - 5 free lead credits', DATEADD('DAY', -60, NOW())),
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder3@example.com')),
 'DEBIT', -1, 4, 'bid', NULL, 'Lead credit used for bid on Kitchen Renovation', DATEADD('DAY', -15, NOW())),

-- Builder 4 (Prime Constructors) - Enterprise plan, 100 credits
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder4@example.com')),
 'SUBSCRIPTION_RENEWAL', 100, 100, 'subscription', NULL, 'Monthly subscription renewal - Enterprise plan', DATEADD('DAY', -30, NOW())),
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder4@example.com')),
 'DEBIT', -1, 99, 'bid', NULL, 'Lead credit used for bid on New House Construction', DATEADD('DAY', -45, NOW())),
((SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder4@example.com')),
 'BONUS', 10, 109, NULL, NULL, 'Bonus credits for verified business profile', DATEADD('DAY', -28, NOW()));

-- =====================================================
-- 18. ADDITIONAL REVIEWS
-- =====================================================
INSERT INTO reviews (reviewer_id, reviewee_id, project_id, review_type, overall_rating, quality_rating, communication_rating, timeliness_rating, value_rating, professionalism_rating, title, comment, pros, cons, status, is_verified_purchase, helpful_count, not_helpful_count, created_at, updated_at) VALUES
-- Builder reviewing client
((SELECT id FROM users WHERE email = 'builder1@example.com'),
 (SELECT id FROM users WHERE email = 'client1@example.com'), NULL,
 'BUILDER_TO_CLIENT', 5, NULL, 5, 5, NULL, 5,
 'Great client to work with',
 'Ahmed Sahab was very clear about requirements and always available for site visits. Payments were always on time. Would love to work with him again.',
 'Clear requirements, timely payments, respectful communication',
 NULL, 'APPROVED', TRUE, 8, 0, DATEADD('DAY', -25, NOW()), DATEADD('DAY', -25, NOW())),

-- Client reviewing builder 4
((SELECT id FROM users WHERE email = 'client3@example.com'),
 (SELECT id FROM users WHERE email = 'builder4@example.com'), NULL,
 'CLIENT_TO_BUILDER', 5, 5, 5, 5, 5, 5,
 'Outstanding Quality - Highly Professional',
 'Prime Constructors is exceptional. Their team is professional, the quality of materials and workmanship is top-notch. The foundation work exceeded our expectations. Highly recommend for any premium construction project.',
 'Premium quality, professional team, excellent communication, transparent pricing',
 'Premium pricing (but worth it)', 'APPROVED', TRUE, 15, 1, DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

-- Client reviewing supplier
((SELECT id FROM users WHERE email = 'client3@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'), NULL,
 'CLIENT_TO_SUPPLIER', 4, 4, 4, 3, 5, 4,
 'Good materials, delivery could be faster',
 'Karachi Building Materials provided quality cement and bricks for our project. Prices are very competitive. Only issue was delivery took 2 extra days.',
 'Competitive prices, good quality materials, wide selection',
 'Delivery was delayed by 2 days', 'APPROVED', TRUE, 5, 1, DATEADD('DAY', -20, NOW()), DATEADD('DAY', -20, NOW())),

-- Builder reviewing supplier
((SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier2@example.com'), NULL,
 'BUILDER_TO_SUPPLIER', 5, 5, 4, 5, 4, 5,
 'Best steel in Lahore',
 'Punjab Steel Works consistently delivers high-quality TMT bars. Amreli Steel grade-60 is excellent. Bulk pricing is fair and delivery is reliable.',
 'Consistent quality, reliable supply, good bulk pricing',
 'Could improve on communication during order changes', 'APPROVED', TRUE, 12, 0, DATEADD('DAY', -15, NOW()), DATEADD('DAY', -15, NOW()));

-- =====================================================
-- 19. ADDITIONAL NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, action_url, is_read, priority, created_at) VALUES
-- Client notifications
((SELECT id FROM users WHERE email = 'client1@example.com'), 'NEW_BID', 'Second Bid Received', 'Pak Builders submitted a bid of PKR 380,000 for Kitchen Renovation.', 'bid', 2, '/client/projects/1/bids', TRUE, 'NORMAL', DATEADD('DAY', -8, NOW())),
((SELECT id FROM users WHERE email = 'client1@example.com'), 'NEW_MESSAGE', 'New Message', 'Muhammad Contractors sent you a message about Kitchen Renovation.', 'chat', 1, '/messages', FALSE, 'NORMAL', DATEADD('DAY', -9, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'PAYMENT_RECEIVED', 'Escrow Funded', 'PKR 3,000,000 has been deposited to escrow for New House Construction.', 'payment', 1, '/client/projects/4/payments', TRUE, 'HIGH', DATEADD('DAY', -44, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'NEW_REVIEW', 'New Review Received', 'Builder4 left you a review. Check it out!', 'review', 3, '/reviews', FALSE, 'NORMAL', DATEADD('DAY', -10, NOW())),

-- Builder notifications
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'PROJECT_AWARDED', 'Project Awarded!', 'You have been awarded the New House Construction project (PKR 18.5M).', 'project', 4, '/builder/projects/4', TRUE, 'HIGH', DATEADD('DAY', -45, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'MILESTONE_COMPLETED', 'Foundation Progress', 'Foundation Work milestone is now 70% complete.', 'milestone', 1, '/builder/projects/4', FALSE, 'NORMAL', DATEADD('DAY', -5, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'NEW_REVIEW', 'New 5-Star Review!', 'Usman Ali left you a 5-star review. Great job!', 'review', 4, '/builder/reviews', FALSE, 'NORMAL', DATEADD('DAY', -10, NOW())),
((SELECT id FROM users WHERE email = 'builder1@example.com'), 'BID_ACCEPTED', 'Bid Shortlisted', 'Your bid for Bathroom Upgrade has been shortlisted! The client is reviewing top bids.', 'bid', 3, '/builder/bids', TRUE, 'HIGH', DATEADD('DAY', -5, NOW())),
((SELECT id FROM users WHERE email = 'builder2@example.com'), 'SUBSCRIPTION_EXPIRING', 'Subscription Expiring Soon', 'Your Basic plan subscription expires in 5 days. Renew now to keep your lead credits.', NULL, NULL, '/builder/subscription', FALSE, 'HIGH', DATEADD('DAY', -2, NOW())),
((SELECT id FROM users WHERE email = 'builder3@example.com'), 'ACCOUNT_VERIFIED', 'Get Verified!', 'Complete your verification to earn the Verified badge and attract more clients.', NULL, NULL, '/builder/verification', FALSE, 'NORMAL', DATEADD('DAY', -20, NOW())),

-- Supplier notifications
((SELECT id FROM users WHERE email = 'supplier1@example.com'), 'NEW_REVIEW', 'New Review', 'A client left a 4-star review for Karachi Building Materials.', 'review', 5, '/supplier/reviews', FALSE, 'NORMAL', DATEADD('DAY', -20, NOW())),

-- Admin notifications
((SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), 'SYSTEM_ANNOUNCEMENT', 'New User Registrations', '12 new users registered this week. 3 builders pending verification.', NULL, NULL, '/admin/users', FALSE, 'NORMAL', DATEADD('DAY', -1, NOW()));

-- =====================================================
-- 23. MATERIAL ORDERS
-- =====================================================
INSERT INTO material_orders (order_number, buyer_id, supplier_id, project_id, subtotal, tax_amount, delivery_fee, discount_amount, total_amount, currency, delivery_address, delivery_city, delivery_contact_name, delivery_contact_phone, requested_delivery_date, estimated_delivery_date, actual_delivery_date, status, payment_status, buyer_notes, supplier_notes, created_at, updated_at) VALUES
('MO-2026-00001',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 350000, 0, 15000, 0, 365000, 'PKR',
 'Plot 23, Street 5, F-7/2, Islamabad', 'Islamabad',
 'Site Foreman - Tariq', '+92-300-9999888',
 DATEADD('DAY', -38, NOW()), DATEADD('DAY', -37, NOW()), DATEADD('DAY', -36, NOW()),
 'DELIVERED', 'PAID',
 'Urgent delivery needed for foundation work. Please ensure A-grade quality.',
 'Order confirmed. Delivery scheduled via our Islamabad warehouse.',
 DATEADD('DAY', -40, NOW()), DATEADD('DAY', -40, NOW())),

('MO-2026-00002',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier2@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 570000, 0, 25000, 28500, 566500, 'PKR',
 'Plot 23, Street 5, F-7/2, Islamabad', 'Islamabad',
 'Site Foreman - Tariq', '+92-300-9999888',
 DATEADD('DAY', -35, NOW()), DATEADD('DAY', -33, NOW()), DATEADD('DAY', -33, NOW()),
 'DELIVERED', 'PAID',
 'Steel for foundation reinforcement. Only Amreli Steel Grade 60 as per contract.',
 '5% bulk discount applied. Grade 60 Amreli confirmed.',
 DATEADD('DAY', -36, NOW()), DATEADD('DAY', -36, NOW())),

('MO-2026-00003',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 230000, 0, 10000, 0, 240000, 'PKR',
 'Plot 23, Street 5, F-7/2, Islamabad', 'Islamabad',
 'Site Foreman - Tariq', '+92-300-9999888',
 DATEADD('DAY', -8, NOW()), DATEADD('DAY', -6, NOW()), NULL,
 'OUT_FOR_DELIVERY', 'PAID',
 'Cement and bricks for basement slab. DG Cement preferred.',
 'DG Cement in stock. Dispatching from Islamabad warehouse.',
 DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW()));

-- =====================================================
-- 24. MATERIAL ORDER ITEMS
-- =====================================================
INSERT INTO material_order_items (order_id, material_id, material_name, material_sku, quantity, unit_of_measure, unit_price, discount_percentage, line_total, quantity_delivered, status, created_at, updated_at) VALUES
-- Order 1: Cement and bricks for foundation
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00001'),
 (SELECT id FROM materials WHERE sku = 'CEM-OPC-50'), 'OPC Cement 50kg Bag', 'CEM-OPC-50',
 200, 'bag', 1150, 0, 230000, 200, 'DELIVERED', DATEADD('DAY', -40, NOW()), DATEADD('DAY', -40, NOW())),

((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00001'),
 (SELECT id FROM materials WHERE sku = 'BRK-RED-A'), 'Red Brick (A-Grade)', 'BRK-RED-A',
 5000, 'piece', 18, 0, 90000, 5000, 'DELIVERED', DATEADD('DAY', -40, NOW()), DATEADD('DAY', -40, NOW())),

((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00001'),
 (SELECT id FROM materials WHERE sku = 'SND-RAVI'), 'Ravi River Sand', 'SND-RAVI',
 8, 'truck', 3500, 0, 28000, 8, 'DELIVERED', DATEADD('DAY', -40, NOW()), DATEADD('DAY', -40, NOW())),

-- Order 2: Steel for foundation
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00002'),
 (SELECT id FROM materials WHERE sku = 'STL-TMT-12'), 'TMT Steel Bar 12mm', 'STL-TMT-12',
 1000, 'piece', 285, 5, 270750, 1000, 'DELIVERED', DATEADD('DAY', -36, NOW()), DATEADD('DAY', -36, NOW())),

((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00002'),
 (SELECT id FROM materials WHERE sku = 'STL-TMT-16'), 'TMT Steel Bar 16mm', 'STL-TMT-16',
 800, 'piece', 380, 5, 288800, 800, 'DELIVERED', DATEADD('DAY', -36, NOW()), DATEADD('DAY', -36, NOW())),

-- Order 3: More cement and bricks for slab
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00003'),
 (SELECT id FROM materials WHERE sku = 'CEM-SRC-50'), 'Sulphate Resistant Cement 50kg', 'CEM-SRC-50',
 100, 'bag', 1350, 0, 135000, 0, 'SHIPPED', DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00003'),
 (SELECT id FROM materials WHERE sku = 'BRK-RED-A'), 'Red Brick (A-Grade)', 'BRK-RED-A',
 3000, 'piece', 18, 0, 54000, 0, 'SHIPPED', DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW()));

-- =====================================================
-- 25. DELIVERIES
-- =====================================================
INSERT INTO deliveries (tracking_number, order_id, supplier_id, delivery_method, carrier_name, status, dispatched_at, estimated_arrival, delivered_at, received_by, delivery_photos, driver_name, driver_phone, vehicle_number, notes, created_at) VALUES
('DEL-2026-00001',
 (SELECT id FROM material_orders WHERE order_number = 'MO-2026-00001'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 'SUPPLIER_DELIVERY', 'KBM Transport', 'DELIVERED',
 DATEADD('DAY', -37, NOW()), DATEADD('DAY', -37, NOW()), DATEADD('DAY', -36, NOW()),
 'Tariq (Site Foreman)',
 '["https://example.com/deliveries/del001-1.jpg"]',
 'Aslam', '+92-300-7777666', 'KHI-4532',
 'Delivery completed in 2 trips. All materials inspected and accepted.',
 DATEADD('DAY', -37, NOW())),

('DEL-2026-00002',
 (SELECT id FROM material_orders WHERE order_number = 'MO-2026-00002'),
 (SELECT id FROM users WHERE email = 'supplier2@example.com'),
 'THIRD_PARTY', 'Punjab Cargo Services', 'DELIVERED',
 DATEADD('DAY', -34, NOW()), DATEADD('DAY', -33, NOW()), DATEADD('DAY', -33, NOW()),
 'Tariq (Site Foreman)',
 '["https://example.com/deliveries/del002-1.jpg","https://example.com/deliveries/del002-2.jpg"]',
 'Nawaz', '+92-301-8888777', 'LHR-8821',
 'Steel bars delivered. Weight verified on site. Quality confirmed as Grade 60.',
 DATEADD('DAY', -34, NOW())),

('DEL-2026-00003',
 (SELECT id FROM material_orders WHERE order_number = 'MO-2026-00003'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 'SUPPLIER_DELIVERY', 'KBM Transport', 'IN_TRANSIT',
 DATEADD('DAY', -2, NOW()), DATEADD('DAY', 0, NOW()), NULL,
 NULL, NULL,
 'Waqas', '+92-300-5555444', 'ISB-2210',
 'Dispatched from Islamabad warehouse. Expected delivery today.',
 DATEADD('DAY', -2, NOW()));

-- =====================================================
-- 26. QUOTE REQUESTS
-- =====================================================
INSERT INTO quote_requests (request_number, requester_id, supplier_id, project_id, items, description, delivery_location, required_by_date, status, quoted_amount, quoted_at, quote_valid_until, quote_notes, created_at, updated_at) VALUES
('QR-2026-00001',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 '[{"description":"OPC Cement 50kg bags","quantity":500,"unit":"bags","specifications":"Lucky or DG Cement only"},{"description":"A-Grade Red Bricks","quantity":20000,"unit":"pieces","specifications":"Standard 9x4x3 inches"},{"description":"River Sand","quantity":20,"unit":"trucks","specifications":"Fine quality for plastering"}]',
 'Bulk order for ground floor structure phase. Need competitive pricing for large quantity.',
 'Plot 23, F-7/2, Islamabad', DATEADD('DAY', 15, NOW()),
 'QUOTED', 1250000, DATEADD('DAY', -3, NOW()), DATEADD('DAY', 12, NOW()),
 '10% bulk discount applied on cement. Free delivery for orders above PKR 1M. Prices valid for 15 days.',
 DATEADD('DAY', -5, NOW()), DATEADD('DAY', -5, NOW())),

('QR-2026-00002',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier2@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 '[{"description":"TMT Steel Bar 12mm","quantity":2000,"unit":"pieces","specifications":"Amreli Grade 60 only"},{"description":"TMT Steel Bar 16mm","quantity":1500,"unit":"pieces","specifications":"Amreli Grade 60 only"},{"description":"TMT Steel Bar 20mm","quantity":500,"unit":"pieces","specifications":"Amreli Grade 60 only"}]',
 'Steel requirements for ground floor columns and beams. Grade 60 mandatory per contract.',
 'Plot 23, F-7/2, Islamabad', DATEADD('DAY', 20, NOW()),
 'SUBMITTED', NULL, NULL, NULL, NULL,
 DATEADD('DAY', -2, NOW()), DATEADD('DAY', -2, NOW()));

-- =====================================================
-- 27. SUPPORT TICKETS
-- =====================================================
INSERT INTO support_tickets (ticket_number, user_id, project_id, category, subject, description, attachments, priority, status, assigned_to, assigned_at, resolution, resolved_at, resolved_by, first_response_at, last_activity_at, created_at, updated_at) VALUES
('TKT-2026-00001',
 (SELECT id FROM users WHERE email = 'client1@example.com'), NULL,
 'PAYMENT', 'Escrow payment showing as pending',
 'I made a payment of PKR 200,000 for my Kitchen Renovation project 2 days ago but it still shows as pending in my dashboard. Payment was deducted from my account.',
 NULL, 'HIGH', 'RESOLVED',
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 DATEADD('DAY', -7, NOW()),
 'Payment status was stuck due to a sync delay. Status has been manually updated to COMPLETED. The escrow account now reflects the correct balance.',
 DATEADD('DAY', -3, NOW()),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 DATEADD('DAY', -7, NOW()), DATEADD('DAY', -3, NOW()),
 DATEADD('DAY', -7, NOW()), DATEADD('DAY', -7, NOW())),

('TKT-2026-00002',
 (SELECT id FROM users WHERE email = 'builder3@example.com'), NULL,
 'VERIFICATION', 'Verification pending since 10 days',
 'I submitted all my verification documents (CNIC, business registration, PEC certificate) 10 days ago but my profile still shows as unverified. Please expedite.',
 '["https://example.com/tickets/docs-builder3.pdf"]', 'NORMAL', 'IN_PROGRESS',
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 DATEADD('DAY', -4, NOW()),
 NULL, NULL, NULL,
 DATEADD('DAY', -4, NOW()), DATEADD('DAY', -2, NOW()),
 DATEADD('DAY', -5, NOW()), DATEADD('DAY', -5, NOW())),

('TKT-2026-00003',
 (SELECT id FROM users WHERE email = 'client2@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00003'),
 'PROJECT', 'Builder not responding to messages',
 'I posted a Full House Painting project and received bids, but the builder I shortlisted is not responding to my messages since 3 days. I need help connecting with them.',
 NULL, 'NORMAL', 'OPEN',
 NULL, NULL,
 NULL, NULL, NULL,
 NULL, DATEADD('DAY', -1, NOW()),
 DATEADD('DAY', -1, NOW()), DATEADD('DAY', -1, NOW()));

-- =====================================================
-- 28. TICKET RESPONSES
-- =====================================================
INSERT INTO ticket_responses (ticket_id, responder_id, message, response_type, is_internal, created_at) VALUES
((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'Hi Ahmed, thank you for reporting this issue. I can see your payment PAY-2026-00003 in our system. Let me check with the payment team and get back to you shortly.',
 'REPLY', FALSE, DATEADD('DAY', -7, NOW())),

((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'Internal note: Payment was processed by MOCK provider but webhook callback was delayed. Need to manually update status in payments table.',
 'INTERNAL_NOTE', TRUE, DATEADD('DAY', -6, NOW())),

((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'Hi Ahmed, the payment status has been updated. Your escrow account now shows the correct balance of PKR 200,000. Apologies for the inconvenience.',
 'REPLY', FALSE, DATEADD('DAY', -3, NOW())),

((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 'Thank you for resolving this quickly!',
 'REPLY', FALSE, DATEADD('DAY', -3, NOW())),

((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00002'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'Hi, thank you for submitting your verification documents. We are currently experiencing a backlog in verification requests. Your documents are in the queue and will be processed within the next 3 business days. We apologize for the delay.',
 'REPLY', FALSE, DATEADD('DAY', -4, NOW())),

((SELECT id FROM support_tickets WHERE ticket_number = 'TKT-2026-00002'),
 (SELECT id FROM users WHERE email = 'support@builderconnect.pk'),
 'Internal: Builder3 documents look good. CNIC verified. Business registration is valid. PEC number checks out. Ready for approval by admin.',
 'INTERNAL_NOTE', TRUE, DATEADD('DAY', -2, NOW()));

-- =====================================================
-- 29. DISPUTES
-- =====================================================
INSERT INTO disputes (dispute_number, filed_by, filed_against, project_id, dispute_type, subject, description, desired_resolution, evidence, disputed_amount, status, assigned_mediator, assigned_at, response_deadline, resolution_deadline, created_at, updated_at) VALUES
('DSP-2026-00001',
 (SELECT id FROM users WHERE email = 'client2@example.com'),
 (SELECT id FROM users WHERE email = 'builder2@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00003'),
 'QUALITY', 'Substandard paint quality used',
 'The builder used a lower-grade paint than what was agreed upon in a previous project. The walls started peeling within 2 weeks of completion. We agreed on Berger Weathercoat but the builder used a local brand.',
 'Repainting with the agreed Berger Weathercoat premium paint at the builder''s expense, or full refund of painting cost (PKR 45,000).',
 '["https://example.com/disputes/paint-peeling-1.jpg","https://example.com/disputes/paint-peeling-2.jpg","https://example.com/disputes/original-agreement.pdf"]',
 45000,
 'UNDER_REVIEW',
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 DATEADD('DAY', -5, NOW()),
 DATEADD('DAY', 5, NOW()),
 DATEADD('DAY', 15, NOW()),
 DATEADD('DAY', -7, NOW()), DATEADD('DAY', -7, NOW()));

-- =====================================================
-- 30. DISPUTE COMMENTS
-- =====================================================
INSERT INTO dispute_comments (dispute_id, user_id, comment, attachments, comment_type, is_internal, created_at) VALUES
((SELECT id FROM disputes WHERE dispute_number = 'DSP-2026-00001'),
 (SELECT id FROM users WHERE email = 'client2@example.com'),
 'I have attached photos showing the paint peeling off and the original agreement specifying Berger Weathercoat. The builder has not responded to my messages.',
 '["https://example.com/disputes/evidence-additional.jpg"]',
 'EVIDENCE', FALSE, DATEADD('DAY', -7, NOW())),

((SELECT id FROM disputes WHERE dispute_number = 'DSP-2026-00001'),
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 'Dispute assigned to mediation. Reviewing evidence submitted by the client. Will contact the builder for their response.',
 NULL, 'MEDIATOR_NOTE', FALSE, DATEADD('DAY', -5, NOW())),

((SELECT id FROM disputes WHERE dispute_number = 'DSP-2026-00001'),
 (SELECT id FROM users WHERE email = 'builder2@example.com'),
 'The client approved the paint change during the project due to Berger Weathercoat being out of stock. We used Nippon Paint which is equivalent quality. The peeling might be due to moisture issue in the walls, not paint quality.',
 NULL, 'RESPONSE', FALSE, DATEADD('DAY', -3, NOW())),

((SELECT id FROM disputes WHERE dispute_number = 'DSP-2026-00001'),
 (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'),
 'Internal note: Need to verify builder''s claim about paint change approval. Check chat history if available.',
 NULL, 'INTERNAL', TRUE, DATEADD('DAY', -2, NOW()));

-- =====================================================
-- 31. AUDIT LOGS (sample entries)
-- =====================================================
INSERT INTO audit_logs (user_id, user_email, user_role, action, action_category, entity_type, entity_id, entity_name, description, ip_address, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'client3@example.com'), 'client3@example.com', 'CLIENT', 'PROJECT_CREATED', 'PROJECT', 'Project', (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'New House Construction', 'Client created new project: New House Construction', '192.168.1.10', 'SUCCESS', DATEADD('DAY', -50, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'builder4@example.com', 'BUILDER', 'BID_SUBMITTED', 'BID', 'Bid', (SELECT id FROM bids WHERE bid_number = 'BID-2026-00004'), 'Bid for New House Construction', 'Builder submitted bid of PKR 18,500,000', '192.168.1.25', 'SUCCESS', DATEADD('DAY', -48, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'client3@example.com', 'CLIENT', 'BID_ACCEPTED', 'BID', 'Bid', (SELECT id FROM bids WHERE bid_number = 'BID-2026-00004'), 'Bid for New House Construction', 'Client accepted bid from Prime Constructors', '192.168.1.10', 'SUCCESS', DATEADD('DAY', -46, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'client3@example.com', 'CLIENT', 'CONTRACT_SIGNED', 'PROJECT', 'Contract', (SELECT id FROM contracts WHERE contract_number = 'CTR-2026-00001'), 'Contract for New House Construction', 'Client signed contract CTR-2026-00001', '192.168.1.10', 'SUCCESS', DATEADD('DAY', -45, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'builder4@example.com', 'BUILDER', 'CONTRACT_SIGNED', 'PROJECT', 'Contract', (SELECT id FROM contracts WHERE contract_number = 'CTR-2026-00001'), 'Contract for New House Construction', 'Builder signed contract CTR-2026-00001', '192.168.1.25', 'SUCCESS', DATEADD('DAY', -45, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'client3@example.com', 'CLIENT', 'ESCROW_FUNDED', 'ESCROW', 'EscrowAccount', (SELECT id FROM escrow_accounts WHERE project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')), 'Escrow for New House Construction', 'Client funded escrow with PKR 3,000,000', '192.168.1.10', 'SUCCESS', DATEADD('DAY', -44, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'client3@example.com', 'CLIENT', 'ESCROW_FUNDED', 'ESCROW', 'EscrowAccount', (SELECT id FROM escrow_accounts WHERE project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')), 'Escrow for New House Construction', 'Client funded additional PKR 2,000,000', '192.168.1.10', 'SUCCESS', DATEADD('DAY', -30, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'builder4@example.com', 'BUILDER', 'MILESTONE_UPDATE', 'MILESTONE', 'Milestone', (SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')), 'Foundation Work', 'Builder posted progress update: 70% complete', '192.168.1.25', 'SUCCESS', DATEADD('DAY', -5, NOW())),
((SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), 'admin@builderconnect.pk', 'ADMIN', 'USER_LOGIN', 'AUTH', 'User', (SELECT id FROM users WHERE email = 'admin@builderconnect.pk'), 'Admin User', 'Admin logged in successfully', '10.0.0.1', 'SUCCESS', DATEADD('DAY', -1, NOW())),
((SELECT id FROM users WHERE email = 'client2@example.com'), 'client2@example.com', 'CLIENT', 'DISPUTE_FILED', 'ADMIN', 'Dispute', (SELECT id FROM disputes WHERE dispute_number = 'DSP-2026-00001'), 'Paint Quality Dispute', 'Client filed dispute about paint quality', '192.168.1.15', 'SUCCESS', DATEADD('DAY', -7, NOW())),
((SELECT id FROM users WHERE email = 'builder1@example.com'), 'builder1@example.com', 'BUILDER', 'PROFILE_UPDATED', 'USER', 'BuilderProfile', (SELECT id FROM builder_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'builder1@example.com')), 'Muhammad Contractors Profile', 'Builder updated profile information', '192.168.1.30', 'SUCCESS', DATEADD('DAY', -3, NOW()));

-- =====================================================
-- 32. SKILL ENDORSEMENTS
-- =====================================================
INSERT INTO skill_endorsements (endorser_id, endorsee_id, skill_name, project_id, comment, created_at) VALUES
((SELECT id FROM users WHERE email = 'client1@example.com'), (SELECT id FROM users WHERE email = 'builder1@example.com'), 'Kitchen Renovation', NULL, 'Excellent kitchen renovation skills. Very detailed work.', DATEADD('DAY', -20, NOW())),
((SELECT id FROM users WHERE email = 'client1@example.com'), (SELECT id FROM users WHERE email = 'builder1@example.com'), 'Plumbing', NULL, 'Great plumbing work during our renovation project.', DATEADD('DAY', -20, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), (SELECT id FROM users WHERE email = 'builder4@example.com'), 'Foundation Work', NULL, 'Exceptional foundation work. Very professional approach.', DATEADD('DAY', -10, NOW())),
((SELECT id FROM users WHERE email = 'client3@example.com'), (SELECT id FROM users WHERE email = 'builder4@example.com'), 'Project Management', NULL, 'Excellent project management and communication throughout.', DATEADD('DAY', -10, NOW())),
((SELECT id FROM users WHERE email = 'builder4@example.com'), (SELECT id FROM users WHERE email = 'supplier2@example.com'), 'Steel Supply', NULL, 'Reliable steel supplier. Always delivers quality Grade 60 Amreli.', DATEADD('DAY', -15, NOW()));

-- =====================================================
-- 33. ADDITIONAL ESCROW ACCOUNT (for kitchen project)
-- =====================================================
INSERT INTO escrow_accounts (project_id, client_id, total_funded, current_balance, is_active, created_at) VALUES
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'),
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 200000, 200000, TRUE, DATEADD('DAY', -10, NOW()));

-- =====================================================
-- 34. UPDATE PROJECT PROGRESS (PRJ-2026-00004)
-- =====================================================
UPDATE projects SET
  progress_percentage = 12,
  current_milestone_id = (SELECT id FROM milestones WHERE title = 'Foundation Work' AND project_id = (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004')),
  bidding_deadline = DATEADD('DAY', -48, NOW()),
  expected_completion_date = '2027-01-10',
  contract_signed_at = DATEADD('DAY', -45, NOW())
WHERE project_number = 'PRJ-2026-00004';

-- Set bidding deadline for open projects
UPDATE projects SET bidding_deadline = DATEADD('DAY', 7, NOW()) WHERE project_number = 'PRJ-2026-00001';
UPDATE projects SET bidding_deadline = DATEADD('DAY', 3, NOW()) WHERE project_number = 'PRJ-2026-00002';
UPDATE projects SET bidding_deadline = DATEADD('DAY', 5, NOW()) WHERE project_number = 'PRJ-2026-00003';
