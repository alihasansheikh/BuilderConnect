-- V22: Add updated_at to notifications table
-- The Notification entity extends BaseEntity which provides @LastModifiedDate (updated_at).
-- Without this column, Hibernate silently writes null on updates like markAsRead().
-- Also adds updated_at to chat_messages (edited messages need timestamp tracking).

ALTER TABLE notifications ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE chat_messages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
