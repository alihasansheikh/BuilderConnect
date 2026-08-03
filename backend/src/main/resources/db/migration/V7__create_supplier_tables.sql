-- V7: Create Supplier and Material Tables
-- BuilderConnect v2 Database Schema

-- =====================================================
-- MATERIAL CATEGORIES - Types of construction materials
-- =====================================================
CREATE TABLE material_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    parent_id BIGINT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE SET NULL,

    INDEX idx_material_cat_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MATERIALS - Supplier product catalog
-- =====================================================
CREATE TABLE materials (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) NOT NULL,
    supplier_id BIGINT NOT NULL,
    category_id BIGINT,

    -- Product info
    name VARCHAR(200) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    specifications JSON, -- Technical specifications

    -- Pricing
    unit_price DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    unit_of_measure VARCHAR(50) NOT NULL, -- e.g., 'bag', 'piece', 'sq ft', 'kg'
    minimum_order_quantity INT DEFAULT 1,
    bulk_discount_percentage DECIMAL(5, 2),
    bulk_discount_threshold INT,

    -- Stock
    stock_quantity INT DEFAULT 0,
    is_in_stock BOOLEAN DEFAULT TRUE,
    restock_date DATE,

    -- Images
    images JSON, -- Array of image URLs
    thumbnail_url VARCHAR(500),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_orders INT DEFAULT 0,

    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,

    UNIQUE KEY uk_material_sku_supplier (sku, supplier_id),

    INDEX idx_material_supplier (supplier_id),
    INDEX idx_material_category (category_id),
    INDEX idx_material_price (unit_price),
    INDEX idx_material_active (is_active),
    INDEX idx_material_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MATERIAL ORDERS - Purchase orders
-- =====================================================
CREATE TABLE material_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(30) NOT NULL UNIQUE,

    -- Parties
    buyer_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,

    -- Related entities
    project_id BIGINT,

    -- Order totals
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    delivery_fee DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',

    -- Delivery info
    delivery_address VARCHAR(500) NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_contact_name VARCHAR(100),
    delivery_contact_phone VARCHAR(20),
    delivery_instructions TEXT,

    -- Dates
    requested_delivery_date DATE,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,

    -- Status
    status ENUM(
        'DRAFT',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'PROCESSING',
        'READY_FOR_DELIVERY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'PARTIALLY_DELIVERED',
        'CANCELLED',
        'RETURNED'
    ) NOT NULL DEFAULT 'DRAFT',

    -- Payment
    payment_status ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    payment_id BIGINT,

    -- Notes
    buyer_notes TEXT,
    supplier_notes TEXT,
    internal_notes TEXT,

    -- Cancellation
    cancelled_at DATETIME,
    cancelled_by BIGINT,
    cancellation_reason TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_order_number (order_number),
    INDEX idx_order_buyer (buyer_id),
    INDEX idx_order_supplier (supplier_id),
    INDEX idx_order_project (project_id),
    INDEX idx_order_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MATERIAL ORDER ITEMS - Line items in orders
-- =====================================================
CREATE TABLE material_order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,

    -- Product snapshot (in case material changes)
    material_name VARCHAR(200) NOT NULL,
    material_sku VARCHAR(50) NOT NULL,

    -- Quantity and pricing
    quantity INT NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    line_total DECIMAL(15, 2) NOT NULL,

    -- Fulfillment
    quantity_delivered INT DEFAULT 0,
    quantity_returned INT DEFAULT 0,

    -- Status
    status ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED') DEFAULT 'PENDING',

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES material_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,

    INDEX idx_order_item_order (order_id),
    INDEX idx_order_item_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DELIVERIES - Delivery tracking
-- =====================================================
CREATE TABLE deliveries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,

    order_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,

    -- Delivery details
    delivery_method ENUM('SUPPLIER_DELIVERY', 'THIRD_PARTY', 'PICKUP') DEFAULT 'SUPPLIER_DELIVERY',
    carrier_name VARCHAR(100),
    carrier_tracking_number VARCHAR(100),

    -- Status
    status ENUM(
        'PREPARING',
        'DISPATCHED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED_DELIVERY',
        'RETURNED'
    ) NOT NULL DEFAULT 'PREPARING',

    -- Dates
    dispatched_at DATETIME,
    estimated_arrival DATETIME,
    delivered_at DATETIME,

    -- Delivery confirmation
    received_by VARCHAR(100),
    signature_url VARCHAR(500),
    delivery_photos JSON,

    -- Issues
    delivery_issues TEXT,
    failed_delivery_reason TEXT,
    return_reason TEXT,

    -- Driver info
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(50),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES material_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_delivery_tracking (tracking_number),
    INDEX idx_delivery_order (order_id),
    INDEX idx_delivery_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- QUOTE REQUESTS - Request for quotes from suppliers
-- =====================================================
CREATE TABLE quote_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(30) NOT NULL UNIQUE,

    requester_id BIGINT NOT NULL,
    supplier_id BIGINT,
    project_id BIGINT,

    -- Items requested
    items JSON NOT NULL, -- Array of {description, quantity, unit, specifications}

    -- Details
    description TEXT,
    delivery_location VARCHAR(500),
    required_by_date DATE,

    -- Status
    status ENUM('DRAFT', 'SUBMITTED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED') DEFAULT 'DRAFT',

    -- Response
    quoted_amount DECIMAL(15, 2),
    quoted_at DATETIME,
    quote_valid_until DATE,
    quote_notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,

    INDEX idx_quote_requester (requester_id),
    INDEX idx_quote_supplier (supplier_id),
    INDEX idx_quote_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default material categories
INSERT INTO material_categories (name, slug, description, icon, display_order) VALUES
('Cement & Concrete', 'cement-concrete', 'Cement, ready-mix concrete, and related products', 'box', 1),
('Bricks & Blocks', 'bricks-blocks', 'Bricks, concrete blocks, and masonry units', 'grid-3x3', 2),
('Steel & Metal', 'steel-metal', 'Steel bars, structural steel, and metal products', 'columns', 3),
('Sand & Aggregate', 'sand-aggregate', 'Sand, gravel, crushed stone, and aggregates', 'layers', 4),
('Lumber & Wood', 'lumber-wood', 'Timber, plywood, and wood products', 'tree-pine', 5),
('Electrical', 'electrical', 'Electrical wires, switches, and fixtures', 'zap', 6),
('Plumbing', 'plumbing', 'Pipes, fittings, and plumbing fixtures', 'droplets', 7),
('Paint & Finishes', 'paint-finishes', 'Paints, coatings, and finishing materials', 'paint-bucket', 8),
('Tiles & Flooring', 'tiles-flooring', 'Ceramic tiles, marble, and flooring materials', 'square', 9),
('Doors & Windows', 'doors-windows', 'Doors, windows, and related hardware', 'door-open', 10),
('Roofing', 'roofing', 'Roofing sheets, tiles, and waterproofing', 'home', 11),
('Hardware & Tools', 'hardware-tools', 'Construction hardware, fasteners, and tools', 'wrench', 12);
