-- V10: Seed Data for Development and Demo
-- BuilderConnect v2 Database Schema
-- Password for all test users: "password" (lowercase)
-- BCrypt hash of "password": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.

-- =====================================================
-- USERS - Test users for each role
-- =====================================================

-- Super Admin
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('alihasansheikh01@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Super Administrator', '+92-300-0000000', 'SUPER_ADMIN', 'Karachi', 'Head Office, Clifton', TRUE, TRUE, NOW());

-- Admins
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('admin@builderconnect.pk', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Admin User', '+92-300-1111111', 'ADMIN', 'Karachi', 'Admin Office, Gulshan', TRUE, TRUE, NOW());

-- Support Agent
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('support@builderconnect.pk', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Support Agent', '+92-300-2222222', 'SUPPORT_AGENT', 'Karachi', 'Support Center', TRUE, TRUE, NOW());

-- Clients
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('client1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Ahmed Khan', '+92-321-1234567', 'CLIENT', 'Karachi', 'House 45, DHA Phase 5, Karachi', TRUE, TRUE, NOW()),
('client2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Sara Ahmed', '+92-333-2345678', 'CLIENT', 'Lahore', 'Apartment 12, Gulberg III, Lahore', TRUE, TRUE, NOW()),
('client3@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Usman Ali', '+92-345-3456789', 'CLIENT', 'Islamabad', 'F-7/2, Islamabad', TRUE, TRUE, NOW());

-- Builders
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('builder1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Muhammad Contractors', '+92-300-4567890', 'BUILDER', 'Karachi', 'Office 5, Tariq Road, Karachi', TRUE, TRUE, NOW()),
('builder2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Ali Construction Co', '+92-301-5678901', 'BUILDER', 'Lahore', 'Township, Lahore', TRUE, TRUE, NOW()),
('builder3@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Pak Builders', '+92-302-6789012', 'BUILDER', 'Karachi', 'North Nazimabad, Karachi', TRUE, TRUE, NOW()),
('builder4@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Prime Constructors', '+92-303-7890123', 'BUILDER', 'Islamabad', 'Blue Area, Islamabad', TRUE, TRUE, NOW());

-- Suppliers
INSERT INTO users (email, password, name, phone, role, city, address, active, email_verified, created_at) VALUES
('supplier1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Karachi Building Materials', '+92-311-8901234', 'SUPPLIER', 'Karachi', 'Site Area, Karachi', TRUE, TRUE, NOW()),
('supplier2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGGnN.5WJdz6KVdCW1x.V3VfXRk.', 'Punjab Steel Works', '+92-312-9012345', 'SUPPLIER', 'Lahore', 'Industrial Area, Lahore', TRUE, TRUE, NOW());

-- =====================================================
-- BUILDER PROFILES
-- =====================================================
INSERT INTO builder_profiles (user_id, company_name, business_registration_number, years_of_experience, bio, specializations, skills, service_areas, is_verified, hourly_rate, minimum_project_value, total_projects_completed, average_rating, total_reviews, subscription_tier, lead_credits, created_at) VALUES
((SELECT id FROM users WHERE email = 'builder1@example.com'), 'Muhammad Contractors Pvt Ltd', 'KC-12345', 15, 'Established construction company with 15 years of experience in residential and commercial projects. Known for quality work and timely delivery.', '["new-construction", "renovation", "interior-design"]', '["concrete", "masonry", "finishing", "electrical", "plumbing"]', '["Karachi", "Hyderabad"]', TRUE, 2500, 50000, 45, 4.75, 38, 'PROFESSIONAL', 50, NOW()),
((SELECT id FROM users WHERE email = 'builder2@example.com'), 'Ali Construction Company', 'LH-67890', 10, 'Specializing in modern home construction and renovation. We bring your dream home to life with attention to detail and customer satisfaction.', '["new-construction", "renovation"]', '["concrete", "masonry", "steel work"]', '["Lahore", "Faisalabad"]', TRUE, 2000, 100000, 28, 4.50, 22, 'BASIC', 25, NOW()),
((SELECT id FROM users WHERE email = 'builder3@example.com'), 'Pak Builders & Developers', 'KC-54321', 8, 'Young and dynamic construction team focused on innovative solutions and cost-effective building. Expert in small to medium residential projects.', '["renovation", "kitchen", "bathroom"]', '["tiling", "painting", "plumbing", "electrical"]', '["Karachi"]', FALSE, 1500, 30000, 15, 4.20, 12, 'FREE', 5, NOW()),
((SELECT id FROM users WHERE email = 'builder4@example.com'), 'Prime Constructors Ltd', 'ISB-11111', 20, 'Premium construction services for discerning clients. Specializing in luxury homes and high-end commercial spaces.', '["new-construction", "interior-design"]', '["concrete", "steel work", "luxury finishing", "smart home"]', '["Islamabad", "Rawalpindi"]', TRUE, 5000, 500000, 62, 4.90, 55, 'ENTERPRISE', 100, NOW());

-- =====================================================
-- SUPPLIER PROFILES
-- =====================================================
INSERT INTO supplier_profiles (user_id, company_name, business_registration_number, description, categories, is_verified, warehouse_address, delivery_areas, minimum_order_value, total_orders_completed, average_rating, created_at) VALUES
((SELECT id FROM users WHERE email = 'supplier1@example.com'), 'Karachi Building Materials Co', 'KBM-001', 'One-stop shop for all construction materials. Cement, steel, sand, and more at competitive prices with fast delivery.', '["cement-concrete", "sand-aggregate", "steel-metal", "bricks-blocks"]', TRUE, 'Plot 45, Site Area, Karachi', '["Karachi", "Hyderabad"]', 5000, 150, 4.60, NOW()),
((SELECT id FROM users WHERE email = 'supplier2@example.com'), 'Punjab Steel Works', 'PSW-002', 'Quality steel products for construction. TMT bars, structural steel, and metal fabrication services.', '["steel-metal"]', TRUE, 'Industrial Estate, Lahore', '["Lahore", "Faisalabad", "Multan"]', 10000, 80, 4.45, NOW());

-- =====================================================
-- SAMPLE PROJECTS
-- =====================================================
INSERT INTO projects (project_number, client_id, title, description, category_id, category_name, city, location_address, budget_min, budget_max, deadline, required_skills, status, is_urgent, published_at, created_at) VALUES
('PRJ-2026-00001', (SELECT id FROM users WHERE email = 'client1@example.com'), 'Kitchen Renovation in DHA', 'Complete kitchen remodeling including new cabinets, countertops, appliances, plumbing, and electrical work. Modern design with Italian tiles.', (SELECT id FROM project_categories WHERE slug = 'kitchen'), 'Kitchen Remodeling', 'Karachi', 'House 45, Street 12, DHA Phase 5, Karachi', 300000, 500000, '2026-04-30', '["kitchen", "plumbing", "electrical", "tiling"]', 'OPEN', FALSE, NOW(), NOW()),
('PRJ-2026-00002', (SELECT id FROM users WHERE email = 'client1@example.com'), 'Bathroom Upgrade', 'Upgrade master bathroom with new fixtures, modern vanity, and walk-in shower. Include waterproofing.', (SELECT id FROM project_categories WHERE slug = 'bathroom'), 'Bathroom Remodeling', 'Karachi', 'House 45, Street 12, DHA Phase 5, Karachi', 150000, 250000, '2026-03-15', '["bathroom", "plumbing", "tiling"]', 'BIDDING', FALSE, NOW(), NOW()),
('PRJ-2026-00003', (SELECT id FROM users WHERE email = 'client2@example.com'), 'Full House Painting', 'Interior and exterior painting for a 10-marla house. Premium quality paints, including ceiling and trim work.', (SELECT id FROM project_categories WHERE slug = 'painting'), 'Painting', 'Lahore', 'House 78, Block D, Gulberg III, Lahore', 100000, 180000, '2026-02-28', '["painting", "finishing"]', 'OPEN', TRUE, NOW(), NOW()),
('PRJ-2026-00004', (SELECT id FROM users WHERE email = 'client3@example.com'), 'New House Construction', 'Construction of a 1-kanal house from foundation to finishing. Modern design with 5 bedrooms, 6 bathrooms, and basement parking.', (SELECT id FROM project_categories WHERE slug = 'new-construction'), 'New Construction', 'Islamabad', 'Plot 23, Street 5, F-7/2, Islamabad', 15000000, 20000000, '2026-12-31', '["construction", "concrete", "electrical", "plumbing", "finishing"]', 'AWARDED', FALSE, NOW(), NOW());

-- =====================================================
-- SAMPLE BIDS
-- =====================================================
INSERT INTO bids (bid_number, project_id, builder_id, amount, proposal, work_plan, estimated_duration_days, labor_cost, material_cost, status, submitted_at, created_at) VALUES
('BID-2026-00001', (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'), (SELECT id FROM users WHERE email = 'builder1@example.com'), 420000, 'We have extensive experience in kitchen renovations. Our team will deliver a modern, functional kitchen within budget and timeline. We use quality materials and provide 1-year warranty.', 'Week 1-2: Demolition and plumbing rough-in\nWeek 3-4: Electrical and cabinet installation\nWeek 5-6: Countertops, tiling, and finishing', 45, 180000, 220000, 'SUBMITTED', NOW(), NOW()),
('BID-2026-00002', (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00001'), (SELECT id FROM users WHERE email = 'builder3@example.com'), 380000, 'Affordable kitchen renovation with quality workmanship. We specialize in modern kitchen designs and can complete within 40 days.', 'Phase 1: Demo (5 days)\nPhase 2: Plumbing/Electrical (10 days)\nPhase 3: Cabinets (10 days)\nPhase 4: Finishing (15 days)', 40, 150000, 210000, 'SUBMITTED', NOW(), NOW()),
('BID-2026-00003', (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00002'), (SELECT id FROM users WHERE email = 'builder1@example.com'), 200000, 'Expert bathroom renovation services. We will transform your bathroom into a modern, luxurious space.', 'Week 1: Demolition and waterproofing\nWeek 2-3: Plumbing and fixtures\nWeek 4: Tiling and finishing', 30, 80000, 110000, 'SHORTLISTED', NOW(), NOW()),
('BID-2026-00004', (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), (SELECT id FROM users WHERE email = 'builder4@example.com'), 18500000, 'Premium house construction with attention to detail. 20+ years experience in luxury homes. Full project management included.', 'Months 1-2: Foundation\nMonths 3-5: Structure\nMonths 6-8: MEP\nMonths 9-11: Finishing\nMonth 12: Handover', 365, 8000000, 10000000, 'ACCEPTED', NOW(), NOW());

-- Update project with awarded builder
UPDATE projects SET awarded_builder_id = (SELECT id FROM users WHERE email = 'builder4@example.com'), status = 'IN_PROGRESS', awarded_at = NOW(), started_at = NOW() WHERE project_number = 'PRJ-2026-00004';

-- =====================================================
-- SAMPLE MILESTONES FOR AWARDED PROJECT
-- =====================================================
INSERT INTO milestones (project_id, title, description, sequence_order, payment_amount, payment_percentage, start_date, due_date, status, deliverables, created_at) VALUES
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'Foundation Work', 'Complete foundation including excavation, footings, and basement slab', 1, 3700000, 20, '2026-01-15', '2026-03-15', 'IN_PROGRESS', '["Excavation completed", "Footings poured", "Basement slab completed", "Waterproofing done"]', NOW()),
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'Structure - Ground Floor', 'Ground floor structure including columns, beams, and slab', 2, 2775000, 15, '2026-03-16', '2026-05-15', 'PENDING', '["Columns erected", "Beams poured", "Slab completed"]', NOW()),
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'Structure - First Floor', 'First floor structure including columns, beams, and slab', 3, 2775000, 15, '2026-05-16', '2026-07-15', 'PENDING', '["Columns erected", "Beams poured", "Slab completed"]', NOW()),
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'MEP Rough-In', 'Electrical, plumbing, and HVAC rough-in work', 4, 2775000, 15, '2026-07-16', '2026-09-15', 'PENDING', '["Electrical conduits", "Plumbing pipes", "HVAC ducts"]', NOW()),
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'Interior Finishing', 'Interior finishing including plastering, painting, tiles, and fixtures', 5, 4625000, 25, '2026-09-16', '2026-11-30', 'PENDING', '["Plastering done", "Painting completed", "Tiles installed", "Fixtures fitted"]', NOW()),
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), 'Final Completion', 'Final touches, cleaning, and handover', 6, 1850000, 10, '2026-12-01', '2026-12-31', 'PENDING', '["Final walkthrough done", "Cleaning done", "Documentation provided"]', NOW());

-- =====================================================
-- SAMPLE ESCROW ACCOUNT
-- =====================================================
INSERT INTO escrow_accounts (project_id, client_id, total_funded, current_balance, is_active, created_at) VALUES
((SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'), (SELECT id FROM users WHERE email = 'client3@example.com'), 5000000, 5000000, TRUE, NOW());

-- =====================================================
-- SAMPLE MATERIALS
-- =====================================================
INSERT INTO materials (sku, supplier_id, category_id, name, description, brand, unit_price, unit_of_measure, minimum_order_quantity, stock_quantity, is_in_stock, images, is_active, is_featured, created_at) VALUES
('CEM-OPC-50', (SELECT id FROM users WHERE email = 'supplier1@example.com'), (SELECT id FROM material_categories WHERE slug = 'cement-concrete'), 'OPC Cement 50kg Bag', 'Ordinary Portland Cement, 50kg bag. Ideal for general construction work.', 'Lucky Cement', 1150, 'bag', 10, 5000, TRUE, '["https://example.com/cement1.jpg"]', TRUE, TRUE, NOW()),
('CEM-SRC-50', (SELECT id FROM users WHERE email = 'supplier1@example.com'), (SELECT id FROM material_categories WHERE slug = 'cement-concrete'), 'Sulphate Resistant Cement 50kg', 'Sulphate resistant cement for foundations in saline soil conditions.', 'DG Cement', 1350, 'bag', 10, 2000, TRUE, '["https://example.com/cement2.jpg"]', TRUE, FALSE, NOW()),
('STL-TMT-12', (SELECT id FROM users WHERE email = 'supplier2@example.com'), (SELECT id FROM material_categories WHERE slug = 'steel-metal'), 'TMT Steel Bar 12mm', 'High-strength TMT steel reinforcement bar, 12mm diameter, 40ft length.', 'Amreli Steel', 285, 'piece', 50, 10000, TRUE, '["https://example.com/steel1.jpg"]', TRUE, TRUE, NOW()),
('STL-TMT-16', (SELECT id FROM users WHERE email = 'supplier2@example.com'), (SELECT id FROM material_categories WHERE slug = 'steel-metal'), 'TMT Steel Bar 16mm', 'High-strength TMT steel reinforcement bar, 16mm diameter, 40ft length.', 'Amreli Steel', 380, 'piece', 50, 8000, TRUE, '["https://example.com/steel2.jpg"]', TRUE, FALSE, NOW()),
('BRK-RED-A', (SELECT id FROM users WHERE email = 'supplier1@example.com'), (SELECT id FROM material_categories WHERE slug = 'bricks-blocks'), 'Red Brick (A-Grade)', 'Premium quality red clay brick, A-grade. Size: 9x4x3 inches.', 'Local', 18, 'piece', 1000, 100000, TRUE, '["https://example.com/brick1.jpg"]', TRUE, FALSE, NOW()),
('SND-RAVI', (SELECT id FROM users WHERE email = 'supplier1@example.com'), (SELECT id FROM material_categories WHERE slug = 'sand-aggregate'), 'Ravi River Sand', 'Fine quality river sand for construction and plastering.', 'Local', 3500, 'truck', 1, 50, TRUE, '["https://example.com/sand1.jpg"]', TRUE, FALSE, NOW());

-- =====================================================
-- SAMPLE REVIEWS
-- =====================================================
INSERT INTO reviews (reviewer_id, reviewee_id, project_id, review_type, overall_rating, quality_rating, communication_rating, timeliness_rating, professionalism_rating, title, comment, status, is_verified_purchase, created_at) VALUES
((SELECT id FROM users WHERE email = 'client1@example.com'), (SELECT id FROM users WHERE email = 'builder1@example.com'), NULL, 'CLIENT_TO_BUILDER', 5, 5, 5, 4, 5, 'Excellent Work!', 'Muhammad Contractors did an amazing job on our renovation. Very professional team, quality materials, and they finished on time. Highly recommended!', 'APPROVED', TRUE, NOW()),
((SELECT id FROM users WHERE email = 'client2@example.com'), (SELECT id FROM users WHERE email = 'builder2@example.com'), NULL, 'CLIENT_TO_BUILDER', 4, 4, 4, 3, 4, 'Good Service', 'Ali Construction did good work overall. There were some minor delays but the final result was satisfactory.', 'APPROVED', TRUE, NOW());

-- =====================================================
-- SAMPLE NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, action_url, is_read, priority, created_at) VALUES
((SELECT id FROM users WHERE email = 'client1@example.com'), 'NEW_BID', 'New Bid Received', 'You received a new bid of PKR 420,000 for your Kitchen Renovation project.', 'bid', 1, '/client/projects/1', FALSE, 'NORMAL', NOW()),
((SELECT id FROM users WHERE email = 'builder1@example.com'), 'PROJECT_AWARDED', 'Congratulations!', 'You have been awarded the Bathroom Upgrade project.', 'project', 2, '/builder/projects/2', FALSE, 'HIGH', NOW()),
((SELECT id FROM users WHERE email = 'client3@example.com'), 'MILESTONE_COMPLETED', 'Milestone Update', 'Foundation Work milestone is in progress for your New House Construction project.', 'milestone', 1, '/client/projects/4', FALSE, 'NORMAL', NOW());

-- =====================================================
-- AWARD BADGES TO VERIFIED BUILDERS
-- =====================================================
INSERT INTO user_badges (user_id, badge_id, awarded_at, award_reason, is_featured) VALUES
((SELECT id FROM users WHERE email = 'builder1@example.com'), (SELECT id FROM badges WHERE code = 'VERIFIED_IDENTITY'), NOW(), 'Identity verified through CNIC and business documents', TRUE),
((SELECT id FROM users WHERE email = 'builder1@example.com'), (SELECT id FROM badges WHERE code = 'VERIFIED_BUSINESS'), NOW(), 'Business registration verified', TRUE),
((SELECT id FROM users WHERE email = 'builder1@example.com'), (SELECT id FROM badges WHERE code = 'TOP_RATED'), NOW(), 'Maintained 4.75+ rating over 45 projects', TRUE),
((SELECT id FROM users WHERE email = 'builder2@example.com'), (SELECT id FROM badges WHERE code = 'VERIFIED_IDENTITY'), NOW(), 'Identity verified', TRUE),
((SELECT id FROM users WHERE email = 'builder4@example.com'), (SELECT id FROM badges WHERE code = 'VERIFIED_IDENTITY'), NOW(), 'Identity verified', TRUE),
((SELECT id FROM users WHERE email = 'builder4@example.com'), (SELECT id FROM badges WHERE code = 'VERIFIED_BUSINESS'), NOW(), 'Business verified', TRUE),
((SELECT id FROM users WHERE email = 'builder4@example.com'), (SELECT id FROM badges WHERE code = 'MASTER_CRAFTSMAN'), NOW(), 'Completed 62 projects with excellence', TRUE),
((SELECT id FROM users WHERE email = 'builder4@example.com'), (SELECT id FROM badges WHERE code = 'LICENSED_PROFESSIONAL'), NOW(), 'PEC registered contractor', FALSE);
