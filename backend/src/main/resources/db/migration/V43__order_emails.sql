-- =====================================================
-- V43: Material order emails
-- =====================================================
-- Per-user opt-out for order emails plus the two templates:
-- supplier notified when an order is placed, buyer notified on
-- CONFIRMED and DELIVERED.

ALTER TABLE notification_preferences ADD COLUMN email_order_update BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO email_templates (template_key, name, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
('order_placed_supplier', 'Order Placed (Supplier)', 'New order {{orderNumber}} received',
 '<h2>New Order Received</h2><p>Hi {{supplierName}},</p><p>You have received a new order <strong>{{orderNumber}}</strong> from <strong>{{buyerName}}</strong>.</p><p>Items: <strong>{{itemCount}}</strong><br/>Total: <strong>PKR {{total}}</strong></p><p>Please log in to your BuilderConnect account to confirm the order.</p>',
 '["supplierName","orderNumber","buyerName","itemCount","total"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW()),

('order_status_buyer', 'Order Status Update (Buyer)', 'Your order {{orderNumber}} is now {{status}}',
 '<h2>Order Update</h2><p>Hi {{buyerName}},</p><p>Your order <strong>{{orderNumber}}</strong> is now <strong>{{status}}</strong>.</p><p>You can track your order from your BuilderConnect dashboard.</p>',
 '["buyerName","orderNumber","status"]', TRUE,
 (SELECT id FROM users WHERE email = 'alihasansheikh01@gmail.com'),
 NOW(), NOW());
