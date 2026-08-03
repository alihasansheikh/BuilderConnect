-- =====================================================
-- V28: Seed PENDING work for supplier demos
-- =====================================================
-- V10/V16 seed only *finished* work for suppliers: every material order is
-- DELIVERED, so a supplier logging in has nothing to act on and the Confirm
-- action button can never be demonstrated.
--
-- This adds the missing *open* states:
--   supplier1 + supplier2 -> a PENDING_CONFIRMATION order each (Confirm order)
--
-- Numbering follows the existing seed rows (MO-), not the service-generated
-- prefixes.
-- =====================================================

-- =====================================================
-- 1. MATERIAL ORDERS awaiting supplier confirmation
-- =====================================================
INSERT INTO material_orders (order_number, buyer_id, supplier_id, project_id, subtotal, tax_amount, delivery_fee, discount_amount, total_amount, currency, delivery_address, delivery_city, delivery_contact_name, delivery_contact_phone, delivery_instructions, requested_delivery_date, status, payment_status, buyer_notes, created_at, updated_at) VALUES
('MO-2026-00004',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 193500, 0, 8000, 0, 201500, 'PKR',
 'Plot 23, Street 5, F-7/2, Islamabad', 'Islamabad',
 'Prime Constructors Site Office', '+92-300-4567890',
 'Deliver to the site gate before noon. Ask for the site office on arrival.',
 DATEADD('DAY', 7, NOW()),
 'PENDING_CONFIRMATION', 'PENDING',
 'Needed for the ground floor slab pour. Please confirm availability for next week.',
 DATEADD('DAY', -1, NOW()), DATEADD('DAY', -1, NOW())),

('MO-2026-00005',
 (SELECT id FROM users WHERE email = 'builder4@example.com'),
 (SELECT id FROM users WHERE email = 'supplier2@example.com'),
 (SELECT id FROM projects WHERE project_number = 'PRJ-2026-00004'),
 247000, 0, 12000, 0, 259000, 'PKR',
 'Plot 23, Street 5, F-7/2, Islamabad', 'Islamabad',
 'Prime Constructors Site Office', '+92-300-4567890',
 'Steel to be unloaded at the rear stockyard.',
 DATEADD('DAY', 10, NOW()),
 'PENDING_CONFIRMATION', 'PENDING',
 'Confirm whether the 16mm bars can ship with the same consignment.',
 NOW(), NOW());

INSERT INTO material_order_items (order_id, material_id, material_name, material_sku, quantity, unit_of_measure, unit_price, discount_percentage, line_total, status, created_at, updated_at) VALUES
-- MO-2026-00004 (supplier1: cement + sand)
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00004'),
 (SELECT id FROM materials WHERE sku = 'CEM-OPC-50'),
 'OPC Cement 50kg Bag', 'CEM-OPC-50', 150, 'bag', 1150, 0, 172500, 'PENDING',
 DATEADD('DAY', -1, NOW()), DATEADD('DAY', -1, NOW())),
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00004'),
 (SELECT id FROM materials WHERE sku = 'SND-RAVI'),
 'Ravi River Sand', 'SND-RAVI', 6, 'truck', 3500, 0, 21000, 'PENDING',
 DATEADD('DAY', -1, NOW()), DATEADD('DAY', -1, NOW())),
-- MO-2026-00005 (supplier2: steel)
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00005'),
 (SELECT id FROM materials WHERE sku = 'STL-TMT-12'),
 'TMT Steel Bar 12mm', 'STL-TMT-12', 600, 'piece', 285, 0, 171000, 'PENDING',
 NOW(), NOW()),
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00005'),
 (SELECT id FROM materials WHERE sku = 'STL-TMT-16'),
 'TMT Steel Bar 16mm', 'STL-TMT-16', 200, 'piece', 380, 0, 76000, 'PENDING',
 NOW(), NOW());
