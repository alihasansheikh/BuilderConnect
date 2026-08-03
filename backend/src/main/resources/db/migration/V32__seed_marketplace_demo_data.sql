-- =====================================================
-- V32: Marketplace demo data
-- - 10 APPROVED product reviews across the 6 seeded materials (project_id NULL)
-- - Rating rollups on materials + supplier_profiles kept exactly consistent
--   with the visible review rows (overwrites V10's unbacked supplier ratings)
-- - One standalone COD order MO-2026-00006 (client1 -> supplier1, no project)
--   with the app's decrement-on-placement stock invariant applied
-- - A seeded ORDER_PLACED notification so supplier1's bell has live data
-- Depends on V31 (reviews.material_id, supplier_profiles.total_reviews).
-- H2 notes: DATEADD not DATE_SUB; multiple NULL project_id rows are allowed
-- under uk_review (reviewer_id, project_id, review_type) because H2 treats
-- NULLs as distinct; per-material uniqueness is enforced in ReviewService.
-- =====================================================

-- ============ 1. PRODUCT REVIEWS ============
INSERT INTO reviews (reviewer_id, reviewee_id, project_id, material_id, review_type,
                     overall_rating, quality_rating, value_rating, title, comment,
                     status, is_verified_purchase, created_at) VALUES
-- CEM-OPC-50 (supplier1): 5, 4, 5 -> avg 4.67 / 3
((SELECT id FROM users WHERE email='client1@example.com'),  (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='CEM-OPC-50'), 'MATERIAL_REVIEW', 5, 5, 4, 'Asli Lucky Cement, sealed bags', 'Ordered 50 bags for our boundary wall in DHA. Bags arrived sealed with proper batch numbers, no setting issues even in Karachi humidity. Mistri was satisfied with the mix strength.', 'APPROVED', FALSE, DATEADD('DAY', -21, NOW())),
((SELECT id FROM users WHERE email='builder1@example.com'), (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='CEM-OPC-50'), 'MATERIAL_REVIEW', 4, 4, 4, 'Reliable for slab work', 'We use this OPC on most of our Karachi sites. Consistent quality, though delivery to Tariq Road took a day longer than promised during monsoon week.', 'APPROVED', FALSE, DATEADD('DAY', -18, NOW())),
((SELECT id FROM users WHERE email='builder2@example.com'), (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='CEM-OPC-50'), 'MATERIAL_REVIEW', 5, 5, 5, 'Best rate in the market', 'Compared rates across three suppliers for a Township project; this was the best per-bag price with fresh stock. Will reorder for the grey structure.', 'APPROVED', FALSE, DATEADD('DAY', -12, NOW())),
-- CEM-SRC-50 (supplier1): 4 -> avg 4.00 / 1
((SELECT id FROM users WHERE email='builder2@example.com'), (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='CEM-SRC-50'), 'MATERIAL_REVIEW', 4, 4, 3, 'Good SRC for saline soil', 'Used for raft foundation near the coast where sulphate attack is a concern. DG SRC performed well in cube tests. Slightly pricey but necessary.', 'APPROVED', FALSE, DATEADD('DAY', -15, NOW())),
-- BRK-RED-A (supplier1): 5, 3 -> avg 4.00 / 2
((SELECT id FROM users WHERE email='client2@example.com'),  (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='BRK-RED-A'), 'MATERIAL_REVIEW', 5, 5, 5, 'Proper awwal number bricks', 'Genuine A-grade bhatta bricks - rang the metallic sound test. Less than 2 percent breakage in a 5000-brick load. Very happy for our Gulberg renovation.', 'APPROVED', FALSE, DATEADD('DAY', -20, NOW())),
((SELECT id FROM users WHERE email='builder1@example.com'), (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='BRK-RED-A'), 'MATERIAL_REVIEW', 3, 3, 3, 'Mixed batch, some seconds', 'Last load had a mix of awwal and doim bricks; about 10 percent were under-fired. Supplier adjusted the bill after we raised it, so fair dealing overall.', 'APPROVED', FALSE, DATEADD('DAY', -9, NOW())),
-- SND-RAVI (supplier1): 4 -> avg 4.00 / 1
((SELECT id FROM users WHERE email='client1@example.com'),  (SELECT id FROM users WHERE email='supplier1@example.com'), NULL, (SELECT id FROM materials WHERE sku='SND-RAVI'),  'MATERIAL_REVIEW', 4, 4, 4, 'Clean sand, full trolley', 'Sand was sieved and clay content was low, good for plaster. Trolley was properly filled, not the usual half-measures. Driver called ahead before delivery.', 'APPROVED', FALSE, DATEADD('DAY', -14, NOW())),
-- STL-TMT-12 (supplier2): 5, 4 -> avg 4.50 / 2
((SELECT id FROM users WHERE email='builder1@example.com'), (SELECT id FROM users WHERE email='supplier2@example.com'), NULL, (SELECT id FROM materials WHERE sku='STL-TMT-12'), 'MATERIAL_REVIEW', 5, 5, 4, 'Genuine Amreli Grade 60', 'Test certificates matched heat numbers on the bars. No rust, straight lengths, proper 40ft. Exactly what you need for column starter bars.', 'APPROVED', FALSE, DATEADD('DAY', -16, NOW())),
((SELECT id FROM users WHERE email='client2@example.com'),  (SELECT id FROM users WHERE email='supplier2@example.com'), NULL, (SELECT id FROM materials WHERE sku='STL-TMT-12'), 'MATERIAL_REVIEW', 4, 4, 4, 'Solid sariya, on-time delivery', 'Our contractor recommended Amreli 12mm for the lintel work. Weight per bundle matched the challan. Delivery to Gulberg was on the promised day.', 'APPROVED', FALSE, DATEADD('DAY', -11, NOW())),
-- STL-TMT-16 (supplier2): 4 -> avg 4.00 / 1
((SELECT id FROM users WHERE email='builder2@example.com'), (SELECT id FROM users WHERE email='supplier2@example.com'), NULL, (SELECT id FROM materials WHERE sku='STL-TMT-16'), 'MATERIAL_REVIEW', 4, 4, 4, 'Good 16mm for beams', 'Used for main beams on a 10-marla project. Bending and cutting on site was clean, no brittleness. Rate is competitive for Lahore market.', 'APPROVED', FALSE, DATEADD('DAY', -7, NOW()));

-- ============ 2. RATING ROLLUPS (consistent with the rows above) ============
UPDATE materials SET average_rating = 4.67, total_reviews = 3 WHERE sku = 'CEM-OPC-50';
UPDATE materials SET average_rating = 4.00, total_reviews = 1 WHERE sku = 'CEM-SRC-50';
UPDATE materials SET average_rating = 4.00, total_reviews = 2 WHERE sku = 'BRK-RED-A';
UPDATE materials SET average_rating = 4.00, total_reviews = 1 WHERE sku = 'SND-RAVI';
UPDATE materials SET average_rating = 4.50, total_reviews = 2 WHERE sku = 'STL-TMT-12';
UPDATE materials SET average_rating = 4.00, total_reviews = 1 WHERE sku = 'STL-TMT-16';

-- supplier1: 7 reviews, sum 30 -> 4.29; supplier2: 3 reviews, sum 13 -> 4.33
UPDATE supplier_profiles SET average_rating = 4.29, total_reviews = 7
 WHERE user_id = (SELECT id FROM users WHERE email = 'supplier1@example.com');
UPDATE supplier_profiles SET average_rating = 4.33, total_reviews = 3
 WHERE user_id = (SELECT id FROM users WHERE email = 'supplier2@example.com');

-- ============ 3. STANDALONE COD ORDER MO-2026-00006 (client1 -> supplier1) ============
INSERT INTO material_orders (order_number, buyer_id, supplier_id, project_id,
    subtotal, tax_amount, delivery_fee, discount_amount, total_amount, currency,
    delivery_address, delivery_city, delivery_contact_name, delivery_contact_phone,
    requested_delivery_date, status, payment_status, payment_method,
    buyer_notes, created_at, updated_at) VALUES
('MO-2026-00006',
 (SELECT id FROM users WHERE email = 'client1@example.com'),
 (SELECT id FROM users WHERE email = 'supplier1@example.com'),
 NULL,
 57500, 0, 2000, 0, 59500, 'PKR',
 'House 45, Street 12, DHA Phase 5, Karachi', 'Karachi',
 'Ahmed Khan', '+92-321-1234567',
 DATEADD('DAY', 3, NOW()),
 'PENDING_CONFIRMATION', 'PENDING', 'CASH_ON_DELIVERY',
 'Standalone order for boundary wall repair. Please deliver in the morning; cash payment on delivery.',
 DATEADD('HOUR', -6, NOW()), DATEADD('HOUR', -6, NOW()));

INSERT INTO material_order_items (order_id, material_id, material_name, material_sku,
    quantity, unit_of_measure, unit_price, discount_percentage, line_total,
    quantity_delivered, status, created_at) VALUES
((SELECT id FROM material_orders WHERE order_number = 'MO-2026-00006'),
 (SELECT id FROM materials WHERE sku = 'CEM-OPC-50'), 'OPC Cement 50kg Bag', 'CEM-OPC-50',
 50, 'bag', 1150, 0, 57500, 0, 'PENDING', DATEADD('HOUR', -6, NOW()));

-- Mirror the app's decrement-on-placement stock invariant (5000 -> 4950)
UPDATE materials SET stock_quantity = stock_quantity - 50 WHERE sku = 'CEM-OPC-50';

-- ============ 4. SUPPLIER NOTIFICATION for the pending order ============
INSERT INTO notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id, action_url, is_read, priority, created_at) VALUES
((SELECT id FROM users WHERE email = 'supplier1@example.com'), 'ORDER_PLACED', 'New Material Order',
 'Ahmed Khan placed order MO-2026-00006 for PKR 59,500 (Cash on Delivery).',
 'material_order', (SELECT id FROM material_orders WHERE order_number = 'MO-2026-00006'),
 '/supplier/orders', FALSE, 'HIGH', DATEADD('HOUR', -6, NOW()));
