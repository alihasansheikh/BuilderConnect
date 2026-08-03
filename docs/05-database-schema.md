# Database Schema (Extracted from Migrations + Entities)

> Schema extracted from Flyway migrations V1-V24 (SQL source of truth) cross-referenced with JPA entities. Conflicts between SQL and Java are flagged.
>
> For JPA entity field definitions and relationships, see [02-domain-model.md](02-domain-model.md).
> This document focuses on the **SQL-level** definitions, constraints, and indexes.

**Database:** H2 in-memory (dev, MODE=MySQL) / MySQL 8.x (prod)
**Engine:** InnoDB (MySQL) / H2 (dev)
**Charset:** utf8mb4, collation utf8mb4_unicode_ci

---

## Tables

### users (V1 + V23)

| Column | SQL Type | Nullable | Default | Constraint |
|--------|----------|----------|---------|------------|
| id | BIGINT | NO | AUTO_INCREMENT | PRIMARY KEY |
| email | VARCHAR(100) | NO | — | UNIQUE |
| password | VARCHAR(255) | NO | — | |
| name | VARCHAR(100) | NO | — | |
| phone | VARCHAR(20) | YES | NULL | |
| role | ENUM('CLIENT','BUILDER','SUPPLIER','SUPPORT_AGENT','ADMIN','SUPER_ADMIN') | NO | — | |
| city | VARCHAR(100) | YES | NULL | |
| address | VARCHAR(500) | YES | NULL | |
| profile_image_url | VARCHAR(500) | YES | NULL | |
| active | BOOLEAN | YES | TRUE | |
| suspended | BOOLEAN | YES | FALSE | |
| suspension_reason | VARCHAR(500) | YES | NULL | |
| email_verified | BOOLEAN | YES | FALSE | |
| email_verification_token | VARCHAR(100) | YES | NULL | |
| email_verification_expires_at | DATETIME | YES | NULL | |
| two_factor_enabled | BOOLEAN | YES | FALSE | |
| two_factor_secret | VARCHAR(100) | YES | NULL | |
| refresh_token | VARCHAR(500) | YES | NULL | |
| refresh_token_expires_at | DATETIME | YES | NULL | |
| last_login | DATETIME | YES | NULL | |
| password_reset_token | VARCHAR(100) | YES | NULL | |
| password_reset_expires_at | DATETIME | YES | NULL | |
| deleted | BOOLEAN | YES | FALSE | |
| deleted_at | DATETIME | YES | NULL | |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | YES | — | ON UPDATE CURRENT_TIMESTAMP |
| failed_login_attempts | INT | NO | 0 | Added V23 |
| account_locked_until | TIMESTAMP | YES | NULL | Added V23 |

**Indexes:** `idx_users_email(email)`, `idx_users_role(role)`, `idx_users_city(city)`, `idx_users_active(active, deleted)`, `idx_users_locked_until(account_locked_until)` (V24)

---

### user_devices (V1)

| Column | SQL Type | Nullable | Default | Constraint |
|--------|----------|----------|---------|------------|
| id | BIGINT | NO | AUTO_INCREMENT | PRIMARY KEY |
| user_id | BIGINT | NO | — | FK → users(id) ON DELETE CASCADE |
| device_id | VARCHAR(100) | NO | — | |
| device_name | VARCHAR(200) | YES | NULL | |
| device_type | ENUM('WEB','MOBILE','TABLET','DESKTOP') | YES | 'WEB' | |
| browser | VARCHAR(100) | YES | NULL | |
| operating_system | VARCHAR(100) | YES | NULL | |
| ip_address | VARCHAR(45) | YES | NULL | |
| last_active_at | DATETIME | YES | NULL | |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Added V23 |

**Indexes:** `idx_user_devices_user(user_id)`, `idx_user_devices_device(device_id)`
**Unique:** `uk_user_device(user_id, device_id)`

---

### projects (V2 + V24)

| Column | SQL Type | Nullable | Default | Constraint |
|--------|----------|----------|---------|------------|
| id | BIGINT | NO | AUTO_INCREMENT | PRIMARY KEY |
| project_number | VARCHAR(20) | NO | — | UNIQUE |
| client_id | BIGINT | NO | — | FK → users(id) |
| awarded_builder_id | BIGINT | YES | NULL | FK → users(id) |
| title | VARCHAR(200) | NO | — | |
| description | TEXT | NO | — | |
| category_id | BIGINT | YES | NULL | |
| category_name | VARCHAR(100) | YES | NULL | |
| city | VARCHAR(100) | NO | — | |
| location_address | VARCHAR(500) | YES | NULL | |
| location_latitude | DECIMAL(10,8) | YES | NULL | |
| location_longitude | DECIMAL(11,8) | YES | NULL | |
| budget_min | DECIMAL(15,2) | YES | NULL | |
| budget_max | DECIMAL(15,2) | YES | NULL | |
| final_budget | DECIMAL(15,2) | YES | NULL | |
| deadline | DATE | YES | NULL | |
| estimated_duration_days | INT | YES | NULL | |
| required_skills | JSON | YES | NULL | |
| attachments | JSON | YES | NULL | |
| special_requirements | TEXT | YES | NULL | |
| status | ENUM('DRAFT','OPEN','BIDDING','AWARDED','CONTRACT_PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED','DISPUTED') | NO | 'DRAFT' | |
| is_urgent | BOOLEAN | YES | FALSE | |
| is_featured | BOOLEAN | YES | FALSE | |
| allow_partial_bids | BOOLEAN | YES | FALSE | |
| progress_percentage | INT | YES | 0 | |
| current_milestone_id | BIGINT | YES | NULL | |
| published_at | DATETIME | YES | NULL | |
| bidding_deadline | DATETIME | YES | NULL | |
| awarded_at | DATETIME | YES | NULL | |
| started_at | DATETIME | YES | NULL | |
| expected_completion_date | DATE | YES | NULL | |
| actual_completion_date | DATE | YES | NULL | |
| cancelled_at | DATETIME | YES | NULL | |
| cancellation_reason | TEXT | YES | NULL | |
| contract_signed_at | DATETIME | YES | NULL | |
| contract_document_url | VARCHAR(500) | YES | NULL | |
| is_public | BOOLEAN | YES | TRUE | |
| deleted | BOOLEAN | YES | FALSE | |
| deleted_at | DATETIME | YES | NULL | |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | YES | — | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** `idx_projects_client(client_id)`, `idx_projects_status(status)`, `idx_projects_city(city)`, `idx_projects_awarded(awarded_builder_id)`
**FK:** `fk_projects_client → users(id)`, `fk_projects_builder → users(id)`

---

### bids (V3)

| Column | SQL Type | Nullable | Default | Constraint |
|--------|----------|----------|---------|------------|
| id | BIGINT | NO | AUTO_INCREMENT | PRIMARY KEY |
| bid_number | VARCHAR(20) | NO | — | UNIQUE |
| project_id | BIGINT | NO | — | FK → projects(id) |
| builder_id | BIGINT | NO | — | FK → users(id) |
| amount | DECIMAL(15,2) | NO | — | |
| proposal | TEXT | NO | — | |
| work_plan | TEXT | YES | NULL | |
| estimated_duration_days | INT | YES | NULL | |
| labor_cost | DECIMAL(15,2) | YES | NULL | |
| material_cost | DECIMAL(15,2) | YES | NULL | |
| other_cost | DECIMAL(15,2) | YES | NULL | |
| attachments | JSON | YES | NULL | |
| status | ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED') | NO | 'DRAFT' | |
| client_notes | TEXT | YES | NULL | |
| rejection_reason | TEXT | YES | NULL | |
| valid_until | DATETIME | YES | NULL | |
| submitted_at | DATETIME | YES | NULL | |
| reviewed_at | DATETIME | YES | NULL | |
| accepted_at | DATETIME | YES | NULL | |
| withdrawn_at | DATETIME | YES | NULL | |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | YES | — | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** `idx_bids_project(project_id)`, `idx_bids_builder(builder_id)`, `idx_bids_status(status)`
**FK:** `fk_bids_project → projects(id)`, `fk_bids_builder → users(id)`

---

### milestones (V3)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| project_id | BIGINT | NO | — | FK → projects(id) |
| title | VARCHAR(200) | NO | — |
| description | TEXT | YES | NULL |
| sequence_order | INT | NO | — |
| payment_amount | DECIMAL(15,2) | YES | NULL |
| payment_percentage | DECIMAL(5,2) | YES | NULL |
| start_date | DATE | YES | NULL |
| due_date | DATE | YES | NULL |
| completed_at | DATETIME | YES | NULL |
| approved_at | DATETIME | YES | NULL |
| approved_by | BIGINT | YES | NULL |
| status | ENUM(9 values) | NO | 'PENDING' |
| progress_percentage | INT | YES | 0 |
| deliverables | JSON | YES | NULL |
| completion_evidence | JSON | YES | NULL |
| rejection_reason | TEXT | YES | NULL |
| payment_transaction_id | BIGINT | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** `idx_milestones_project(project_id)`, `idx_milestones_status(status)`

---

### escrow_accounts (V4)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| project_id | BIGINT | NO | UNIQUE, FK → projects(id) |
| client_id | BIGINT | NO | FK → users(id) |
| total_funded | DECIMAL(15,2) | YES | 0.00 |
| total_released | DECIMAL(15,2) | YES | 0.00 |
| total_refunded | DECIMAL(15,2) | YES | 0.00 |
| current_balance | DECIMAL(15,2) | YES | 0.00 |
| pending_release | DECIMAL(15,2) | YES | 0.00 |
| currency | VARCHAR(3) | YES | 'PKR' |
| is_active | BOOLEAN | YES | TRUE |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### escrow_transactions (V4)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| escrow_account_id | BIGINT | NO | FK → escrow_accounts(id) |
| transaction_reference | VARCHAR(30) | NO | UNIQUE |
| transaction_type | ENUM('FUND','RELEASE','REFUND','HOLD','DISPUTE_HOLD','DISPUTE_RELEASE','FEE','ADJUSTMENT') | NO | — |
| amount | DECIMAL(15,2) | NO | — |
| fee_amount | DECIMAL(15,2) | YES | 0.00 |
| net_amount | DECIMAL(15,2) | YES | NULL |
| balance_before | DECIMAL(15,2) | YES | NULL |
| balance_after | DECIMAL(15,2) | YES | NULL |
| milestone_id | BIGINT | YES | NULL |
| payment_id | BIGINT | YES | NULL |
| description | VARCHAR(500) | YES | NULL |
| status | ENUM('PENDING','COMPLETED','FAILED','REVERSED') | NO | 'PENDING' |
| initiated_by | BIGINT | YES | NULL |
| initiated_at | DATETIME | YES | NULL |
| completed_at | DATETIME | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### chat_rooms (V5)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| room_code | VARCHAR(50) | NO | UNIQUE |
| room_type | ENUM('PROJECT','BID','SUPPORT','DIRECT','GROUP') | NO | — |
| name | VARCHAR(200) | YES | NULL |
| project_id | BIGINT | YES | NULL |
| created_by | BIGINT | YES | NULL |
| last_message_at | DATETIME | YES | NULL |
| last_message_preview | VARCHAR(500) | YES | NULL |
| is_active | BOOLEAN | YES | TRUE |
| support_ticket_id | BIGINT | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### chat_messages (V5 + V22)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| chat_room_id | BIGINT | NO | FK → chat_rooms(id) ON DELETE CASCADE |
| sender_id | BIGINT | NO | FK → users(id) |
| message_type | ENUM('TEXT','IMAGE','FILE','SYSTEM','MILESTONE_UPDATE','PAYMENT_NOTIFICATION') | NO | 'TEXT' |
| content | TEXT | NO | — |
| attachment_url | VARCHAR(500) | YES | NULL |
| attachment_name | VARCHAR(200) | YES | NULL |
| is_edited | BOOLEAN | YES | FALSE |
| is_deleted | BOOLEAN | YES | FALSE |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | CURRENT_TIMESTAMP | Added V22+V23 |

---

### chat_room_participants (V5 + V23 + V24)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| chat_room_id | BIGINT | NO | FK → chat_rooms(id) ON DELETE CASCADE |
| user_id | BIGINT | NO | FK → users(id) |
| role | ENUM('OWNER','ADMIN','MEMBER','OBSERVER') | YES | 'MEMBER' |
| joined_at | DATETIME | YES | CURRENT_TIMESTAMP |
| last_read_at | DATETIME | YES | NULL |
| last_read_message_id | BIGINT | YES | NULL |
| is_muted | BOOLEAN | YES | FALSE |
| left_at | DATETIME | YES | NULL |
| is_active | BOOLEAN | YES | TRUE |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Added V23 |

**Unique:** `uk_participant(chat_room_id, user_id)`
**Indexes:** `idx_chat_room_participants_last_read(last_read_message_id)` (V24)
**FK:** `fk_participant_last_read → chat_messages(id) ON DELETE SET NULL` (V5, ALTER TABLE)

---

### contracts (V11)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| contract_number | VARCHAR(20) | NO | UNIQUE |
| project_id | BIGINT | NO | FK → projects(id) |
| client_id | BIGINT | NO | FK → users(id) |
| builder_id | BIGINT | NO | FK → users(id) |
| status | ENUM('DRAFT','PENDING_CLIENT','PENDING_BUILDER','ACTIVE','COMPLETED','TERMINATED','DISPUTED') | NO | 'DRAFT' |
| total_amount | DECIMAL(15,2) | YES | NULL |
| payment_terms | TEXT | YES | NULL |
| scope_of_work | TEXT | YES | NULL |
| terms_and_conditions | TEXT | YES | NULL |
| special_clauses | TEXT | YES | NULL |
| start_date | DATE | YES | NULL |
| end_date | DATE | YES | NULL |
| client_signed_at | DATETIME | YES | NULL |
| client_ip_address | VARCHAR(50) | YES | NULL |
| builder_signed_at | DATETIME | YES | NULL |
| builder_ip_address | VARCHAR(50) | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### reviews (V8)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| reviewer_id | BIGINT | NO | FK → users(id) |
| reviewee_id | BIGINT | NO | FK → users(id) |
| project_id | BIGINT | YES | NULL |
| review_type | ENUM(7 values) | NO | — |
| rating | INT | NO | — | Note: entity field is `overallRating` |
| quality_rating | INT | YES | NULL |
| communication_rating | INT | YES | NULL |
| timeliness_rating | INT | YES | NULL |
| title | VARCHAR(200) | YES | NULL |
| comment | TEXT | YES | NULL |
| status | ENUM('PENDING','APPROVED','REJECTED','FLAGGED','HIDDEN') | NO | 'PENDING' |
| is_verified_purchase | BOOLEAN | YES | FALSE |
| response | TEXT | YES | NULL |
| moderated_at | DATETIME | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### notifications (V5 + V21 + V22)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| user_id | BIGINT | NO | FK → users(id) |
| notification_type | VARCHAR(50) | NO | — | Was ENUM, converted V21 |
| title | VARCHAR(200) | NO | — |
| message | TEXT | NO | — |
| icon | VARCHAR(50) | YES | NULL |
| related_entity_type | VARCHAR(50) | YES | NULL |
| related_entity_id | BIGINT | YES | NULL |
| action_url | VARCHAR(500) | YES | NULL |
| is_read | BOOLEAN | YES | FALSE |
| read_at | DATETIME | YES | NULL |
| priority | VARCHAR(10) | YES | 'NORMAL' |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | CURRENT_TIMESTAMP | Added V22 |

---

### payments (V11)

| Column | SQL Type | Nullable | Default |
|--------|----------|----------|---------|
| id | BIGINT | NO | AUTO_INCREMENT, PK |
| payment_reference | VARCHAR(30) | NO | UNIQUE |
| payer_id | BIGINT | YES | FK → users(id) |
| payee_id | BIGINT | YES | FK → users(id) |
| project_id | BIGINT | YES | FK → projects(id) |
| milestone_id | BIGINT | YES | FK → milestones(id) |
| escrow_transaction_id | BIGINT | YES | NULL |
| payment_type | ENUM(7 values) | NO | — |
| amount | DECIMAL(15,2) | NO | — |
| fee_amount | DECIMAL(15,2) | YES | 0.00 |
| net_amount | DECIMAL(15,2) | YES | NULL |
| currency | VARCHAR(3) | YES | 'PKR' |
| payment_method | ENUM('MOCK','STRIPE','PAYPAL','BANK_TRANSFER','CASH') | YES | NULL |
| status | ENUM('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED','CANCELLED') | NO | 'PENDING' |
| failure_reason | TEXT | YES | NULL |
| initiated_at | DATETIME | YES | NULL |
| completed_at | DATETIME | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | YES | ON UPDATE CURRENT_TIMESTAMP |

---

### builder_profiles (V1 + V11 + V18)

Created in V1 with basic fields, extended significantly in V11 with subscription/lead/verification fields, banner image added in V18.

**Key columns (30+):** company_name, years_of_experience, bio, specializations (JSON), skills (JSON), service_areas (JSON), is_verified, hourly_rate, average_rating, subscription_tier, lead_credits, banner_image_url, and many more.

---

## Additional Tables (Abbreviated)

| Table | Migration | Key Columns | FK References |
|-------|-----------|-------------|---------------|
| project_categories | V2 | name, description, parent_category_id | self-ref |
| project_tasks | V2 | project_id, title, status, assigned_to | projects, users |
| project_attachments | V2 + V19 | project_id, file_name, file_url, attachment_type | projects |
| milestone_updates | V3 | milestone_id, update_type, message | milestones, users |
| bid_messages | V3 | bid_id, sender_id, message | bids, users |
| message_read_receipts | V5 | message_id, user_id, read_at | chat_messages, users |
| supplier_profiles | V7 | user_id, company_name, categories (JSON) | users |
| materials | V7 | supplier_id, name, unit_price, stock_quantity | users |
| material_categories | V7 | name, description, parent_category_id | self-ref |
| material_orders | V7 | project_id, supplier_id, status, total_amount | projects, users |
| material_order_items | V7 | order_id, material_id, quantity, total_price | material_orders, materials |
| deliveries | V7 | order_id, delivery_number, status | material_orders |
| quote_requests | V7 | project_id, supplier_id, status | projects, users |
| review_helpfulness | V8 | review_id, user_id, is_helpful | reviews, users |
| badges | V8 | name, code (UNIQUE), category, criteria_type | — |
| user_badges | V8 | user_id, badge_id, awarded_at | users, badges |
| skill_endorsements | V8 | endorser_id, endorsee_id, skill_name | users |
| support_tickets | V9 | user_id, category, priority, status, subject | users |
| ticket_responses | V9 | ticket_id, user_id, message, is_internal | support_tickets, users |
| disputes | V9 | project_id, filed_by, filed_against, status | projects, users |
| dispute_comments | V9 | dispute_id, user_id, comment, is_internal | disputes, users |
| audit_logs | V9 | user_id, action, action_category, entity_type | users |
| system_settings | V9 | setting_key (UNIQUE), setting_value, setting_type | — |
| announcements | V9 | title, announcement_type, display_position | — |
| subscription_plans | V11 | name, tier, price, lead_credits_per_month | — |
| lead_transactions | V11 | builder_profile_id, transaction_type, amount | builder_profiles |
| invoices | V11 | invoice_number, payer/payee, amount, status | users, projects |
| email_logs | V11 | recipient_id, template_key, status | users |
| change_requests | V12 | project_id, change_type, status | projects, users |
| contract_versions | V13 | contract_id, version_number, change_summary | contracts, users |
| cms_pages | V14 | slug (UNIQUE), title, content, status | — |
| blog_posts | V14 | slug (UNIQUE), title, content, status | users |
| email_templates | V14 | template_key (UNIQUE), name, subject, body | — |
| notification_preferences | V17 | user_id (UNIQUE), email_*/push_* booleans | users |

---

## Relationships (DB-Level FK Constraints)

| Parent | Child | FK Column | ON DELETE |
|--------|-------|-----------|-----------|
| users | user_devices | user_id | CASCADE |
| users | projects (client) | client_id | — |
| users | projects (builder) | awarded_builder_id | — |
| users | bids | builder_id | — |
| users | notifications | user_id | — |
| users | reviews (reviewer) | reviewer_id | — |
| users | reviews (reviewee) | reviewee_id | — |
| users | chat_messages | sender_id | — |
| users | chat_room_participants | user_id | — |
| users | support_tickets | user_id | — |
| users | audit_logs | user_id | — |
| projects | bids | project_id | — |
| projects | milestones | project_id | — |
| projects | escrow_accounts | project_id | — |
| projects | contracts | project_id | — |
| projects | change_requests | project_id | — |
| projects | material_orders | project_id | — |
| projects | disputes | project_id | — |
| escrow_accounts | escrow_transactions | escrow_account_id | — |
| chat_rooms | chat_messages | chat_room_id | CASCADE |
| chat_rooms | chat_room_participants | chat_room_id | CASCADE |
| chat_messages | chat_room_participants.last_read | last_read_message_id | SET NULL |
| milestones | milestone_updates | milestone_id | — |
| bids | bid_messages | bid_id | — |
| material_orders | material_order_items | order_id | — |
| material_orders | deliveries | order_id | — |
| disputes | dispute_comments | dispute_id | — |
| support_tickets | ticket_responses | ticket_id | — |
| builder_profiles | lead_transactions | builder_profile_id | — |
| contracts | contract_versions | contract_id | — |

---

## Indexes (V15 Performance Indexes + V24)

**V15 adds comprehensive indexes across all major tables:**

| Table | Index | Columns |
|-------|-------|---------|
| projects | idx_projects_status | status |
| projects | idx_projects_city | city |
| projects | idx_projects_client | client_id |
| projects | idx_projects_awarded | awarded_builder_id |
| bids | idx_bids_project | project_id |
| bids | idx_bids_builder | builder_id |
| bids | idx_bids_status | status |
| milestones | idx_milestones_project | project_id |
| milestones | idx_milestones_status | status |
| notifications | idx_notifications_user | user_id |
| notifications | idx_notifications_read | is_read |
| chat_messages | idx_chat_messages_room | chat_room_id |
| chat_messages | idx_chat_messages_sender | sender_id |
| payments | idx_payments_payer | payer_id |
| payments | idx_payments_project | project_id |
| reviews | idx_reviews_reviewee | reviewee_id |
| reviews | idx_reviews_status | status |
| audit_logs | idx_audit_logs_user | user_id |
| audit_logs | idx_audit_logs_category | action_category |
| users | idx_users_locked_until | account_locked_until (V24) |
| chat_room_participants | idx_chat_room_participants_last_read | last_read_message_id (V24) |

---

## Constraints Summary

### Unique Constraints
| Table | Constraint | Columns |
|-------|-----------|---------|
| users | email | email |
| projects | project_number | project_number |
| bids | bid_number | bid_number |
| escrow_accounts | project_id | project_id |
| chat_rooms | room_code | room_code |
| chat_room_participants | uk_participant | (chat_room_id, user_id) |
| contracts | contract_number | contract_number |
| payments | payment_reference | payment_reference |
| escrow_transactions | transaction_reference | transaction_reference |
| badges | code | code |
| system_settings | setting_key | setting_key |
| cms_pages | slug | slug |
| blog_posts | slug | slug |
| email_templates | template_key | template_key |
| notification_preferences | user_id | user_id |
| user_devices | uk_user_device | (user_id, device_id) |

### NOT NULL Required Fields
All tables require: `id`, `created_at`
Key business fields: `users.email`, `users.password`, `users.name`, `users.role`, `projects.title`, `projects.description`, `projects.city`, `bids.amount`, `bids.proposal`, `milestones.title`, `milestones.sequence_order`

---

## Inconsistencies

### Entity vs DB Mismatches

| Issue | Entity Says | SQL Says | Severity |
|-------|------------|----------|----------|
| **User.active** | `@Column(nullable = false)` | `BOOLEAN DEFAULT TRUE` (nullable in SQL) | LOW — default covers it |
| **User.suspended** | `@Column(nullable = false)` | `BOOLEAN DEFAULT FALSE` (nullable in SQL) | LOW |
| **Review.overallRating** | Field name `overallRating` | Column name `rating` | LOW — @Column maps it |
| **ChatMessage** | Does NOT extend BaseEntity | SQL has `created_at`, `updated_at` | MEDIUM — works but inconsistent |
| **ChatRoomParticipant** | Uses Long `chatRoomId`, `userId` | FK constraints exist on these columns | MEDIUM — works but no type safety |
| **BuilderProfile.subscriptionTier** | `String` field | SQL likely ENUM or VARCHAR | LOW — no strict enforcement |
| **notifications.notification_type** | `@Enumerated(STRING)` (Java enum) | `VARCHAR(50)` (V21 converted from ENUM) | LOW — VARCHAR accepts all enum names |

### Missing Indexes (Potential Performance Issues)

| Table | Column | Used In | Has Index? |
|-------|--------|---------|------------|
| disputes | filed_by | DisputeService queries | NO |
| disputes | filed_against | DisputeService queries | NO |
| support_tickets | assigned_to | SupportTicketService queries | NO |
| material_orders | supplier_id | MaterialOrderService queries | NO |
| payments | milestone_id | PaymentService queries | NO |
| invoices | issued_to | InvoiceService queries | UNKNOWN |

### Missing CHECK Constraints

| Table | Column | Expected Range | Has CHECK? |
|-------|--------|---------------|------------|
| reviews | rating | 1-5 | NO |
| reviews | quality_rating | 1-5 | NO |
| milestones | payment_percentage | 0-100 | NO |
| milestones | progress_percentage | 0-100 | NO |
| projects | progress_percentage | 0-100 | NO |
| bids | amount | > 0 | NO |
| payments | amount | > 0 | NO |

**Note:** V24 originally included CHECK constraints but they were removed due to H2 compatibility issues. Constraints exist only in application-layer validation (service code).

---

## Risks

### Data Integrity

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No CHECK constraints on ratings/amounts** | Invalid values (rating=99, amount=-1) could be inserted via direct SQL | Application-layer validation in services; no DB enforcement |
| **JSON columns as VARCHAR/TEXT** | Invalid JSON can be stored; no schema validation | Frontend `parseJsonArray()` handles encoding; no DB enforcement |
| **No FK on milestones.approved_by** | References user by Long ID, no constraint | Application checks user exists |
| **No FK on escrow_transactions.payment_id** | V4 adds FK via ALTER TABLE, but column was added in V11 | Potential ordering issue in Flyway |
| **Cascade DELETE on chat_messages** | Deleting a chat_room deletes ALL messages permanently | Intended behavior but loses audit trail |
| **Cascade DELETE on user_devices** | Deleting a user deletes all device records | Likely intended |
| **No FK on disputes.mediator columns** | `assigned_mediator_id` references user by Long | Application validates user role |
| **Escrow balance can theoretically go negative** | `release()` subtracts without DB-level check | Application uses pessimistic locking + `canRelease()` check |
| **No DB-level enforcement of status transitions** | Any status can be set to any value | Application-layer state machine only |

### Seed Data Risks

| Risk | Impact |
|------|--------|
| V10 + V16 both seed `email_templates` | Potential duplicate key if both run on existing data |
| V10 + V16 both seed `system_settings` | Same risk as above |
| V10 + V16 both seed `reviews` | Same risk — uses INSERT IGNORE in V16 to mitigate |

---

## Unknowns

1. **Are all FK constraints from V3-V9 ALTER TABLE statements applied in H2?** H2 MODE=MySQL may not support all MySQL FK syntax.
2. **Does `ON UPDATE CURRENT_TIMESTAMP` work in H2?** H2 has limited support for this MySQL-specific feature.
3. **Are the V15 performance indexes effective for H2?** H2 may not optimize the same way MySQL does.
4. **Is `escrow_transactions.payment_id` FK properly ordered?** Column referenced before `payments` table exists (V4 vs V11).
6. **Total table count:** Based on migrations, approximately **48-50 tables** exist. Exact count depends on whether all ALTER TABLE statements in later migrations introduce new tables vs modify existing ones.
