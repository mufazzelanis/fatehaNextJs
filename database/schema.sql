-- Mashroom Dentocare Plus — MySQL / MariaDB schema
-- Run with: npm run db:setup  (creates the database, tables and seed data)

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(20)  NULL UNIQUE,
  email         VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('admin','customer') NOT NULL DEFAULT 'customer',
  address       VARCHAR(500) NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200)  NOT NULL,
  slug           VARCHAR(200)  NOT NULL UNIQUE,
  weight         VARCHAR(50)   NULL,
  price          DECIMAL(10,2) NOT NULL,
  regular_price  DECIMAL(10,2) NULL,
  stock          INT           NOT NULL DEFAULT 0,
  image          VARCHAR(300)  NULL,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no        VARCHAR(20)   NULL UNIQUE,
  user_id         INT UNSIGNED  NULL,
  customer_name   VARCHAR(120)  NOT NULL,
  phone           VARCHAR(20)   NOT NULL,
  address         VARCHAR(500)  NOT NULL,
  note            VARCHAR(1000) NULL,
  shipping_zone   ENUM('inside','outside') NOT NULL,
  shipping_charge DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(30)   NOT NULL DEFAULT 'cod',
  status          ENUM('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
  admin_note      VARCHAR(1000) NULL,
  ip_address      VARCHAR(64)   NULL,
  user_agent      VARCHAR(300)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_phone (phone),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED  NOT NULL,
  product_id   INT UNSIGNED  NULL,
  product_name VARCHAR(200)  NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  quantity     INT           NOT NULL,
  line_total   DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  status     VARCHAR(20)  NOT NULL,
  note       VARCHAR(500) NULL,
  changed_by INT UNSIGNED NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_history_order (order_id),
  CONSTRAINT fk_history_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocked_phones (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone      VARCHAR(20)  NOT NULL UNIQUE,
  reason     VARCHAR(300) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key`   VARCHAR(80) PRIMARY KEY,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Facebook Conversions API: every server event sent, for the admin log
CREATE TABLE IF NOT EXISTS pixel_event_log (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_name  VARCHAR(50)  NOT NULL,
  event_id    VARCHAR(100) NOT NULL,
  order_id    INT UNSIGNED NULL,
  success     TINYINT(1)   NOT NULL DEFAULT 0,
  http_status SMALLINT     NULL,
  is_test     TINYINT(1)   NOT NULL DEFAULT 0,
  response    VARCHAR(1000) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pixel_created (created_at),
  INDEX idx_pixel_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columns added after the first release (safe to re-run)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbp VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbc VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_source_url VARCHAR(500) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pixel_purchase_sent_at DATETIME NULL;
ALTER TABLE pixel_event_log ADD COLUMN IF NOT EXISTS pixel_id VARCHAR(20) NULL;
ALTER TABLE pixel_event_log ADD COLUMN IF NOT EXISTS payload TEXT NULL;
ALTER TABLE pixel_event_log ADD COLUMN IF NOT EXISTS retried TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE pixel_event_log ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64) NULL;
ALTER TABLE pixel_event_log ADD COLUMN IF NOT EXISTS client_ua VARCHAR(300) NULL;
ALTER TABLE pixel_event_log ADD INDEX IF NOT EXISTS idx_pixel_event_time (event_name, created_at);

-- Staff roles & permissions
CREATE TABLE IF NOT EXISTS roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60)  NOT NULL,
  slug        VARCHAR(60)  NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  permissions TEXT         NOT NULL,
  is_system   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT UNSIGNED NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT UNSIGNED NULL;

-- Audit trail of everything staff do in the admin panel
CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NULL,
  user_name   VARCHAR(120)  NULL,
  action      VARCHAR(60)   NOT NULL,
  module      VARCHAR(30)   NOT NULL,
  entity_type VARCHAR(40)   NULL,
  entity_id   VARCHAR(40)   NULL,
  description VARCHAR(500)  NOT NULL,
  changes     TEXT          NULL,
  ip_address  VARCHAR(64)   NULL,
  user_agent  VARCHAR(300)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created (created_at),
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_module (module),
  INDEX idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Editable checkout: any number of delivery zones and custom fields
ALTER TABLE orders MODIFY shipping_zone VARCHAR(40) NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_fields TEXT NULL;

-- Main store: categories and richer products
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  description VARCHAR(500) NULL,
  image       VARCHAR(300) NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT UNSIGNED NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(80) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(60) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(500) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description MEDIUMTEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_store TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url VARCHAR(300) NULL;

-- Bangladesh locations (district → thana/upazila → union), ids match the old fatehabd.com
CREATE TABLE IF NOT EXISTS districts (
  id      INT UNSIGNED PRIMARY KEY,
  name    VARCHAR(80) NOT NULL,
  bn_name VARCHAR(80) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS thanas (
  id          INT UNSIGNED PRIMARY KEY,
  district_id INT UNSIGNED NOT NULL,
  name        VARCHAR(80) NOT NULL,
  bn_name     VARCHAR(80) NULL,
  INDEX idx_thana_district (district_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unions (
  id       INT UNSIGNED PRIMARY KEY,
  thana_id INT UNSIGNED NOT NULL,
  name     VARCHAR(80) NOT NULL,
  bn_name  VARCHAR(80) NULL,
  INDEX idx_union_thana (thana_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Storefront orders: where they came from, the delivery area, and payment verification
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'landing';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS district_id INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS thana_id INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS union_id INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_sender VARCHAR(40) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_trx VARCHAR(80) NULL;
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_area (district_id, thana_id, union_id);

-- Dealer network (district → thana → union)
CREATE TABLE IF NOT EXISTS dealers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  level         VARCHAR(10)  NULL,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(20)  NOT NULL UNIQUE,
  email         VARCHAR(190) NULL,
  nid_number    VARCHAR(30)  NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  address       VARCHAR(500) NOT NULL,
  district_id   INT UNSIGNED NOT NULL,
  thana_id      INT UNSIGNED NOT NULL,
  union_id      INT UNSIGNED NULL,
  photo         VARCHAR(200) NULL,
  bank_slip     VARCHAR(200) NULL,
  nid_front     VARCHAR(200) NULL,
  nid_back      VARCHAR(200) NULL,
  status        VARCHAR(12)  NOT NULL DEFAULT 'pending',
  admin_note    VARCHAR(500) NULL,
  reviewed_by   INT UNSIGNED NULL,
  reviewed_at   DATETIME     NULL,
  last_login_at DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dealer_area (district_id, thana_id, union_id),
  INDEX idx_dealer_status (status, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dealer_targets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dealer_id   INT UNSIGNED  NOT NULL,
  month       CHAR(7)       NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  set_by      VARCHAR(10)   NOT NULL,
  set_by_id   INT UNSIGNED  NULL,
  note        VARCHAR(255)  NULL,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_target (dealer_id, month),
  CONSTRAINT fk_target_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dealer applications: the level the applicant asked for (admin confirms `level` on approval).
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS applied_level VARCHAR(10) NULL;
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_thana (thana_id, created_at);
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_union (union_id, created_at);

-- Landing pages: each one has its own URL, product, content, checkout form and SEO.
CREATE TABLE IF NOT EXISTS landing_pages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(80)  NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  status          VARCHAR(12)  NOT NULL DEFAULT 'draft',
  product_id      INT UNSIGNED NULL,
  content         MEDIUMTEXT   NULL,
  checkout        MEDIUMTEXT   NULL,
  banner_image    VARCHAR(200) NULL,
  seo_title       VARCHAR(200) NULL,
  seo_description VARCHAR(300) NULL,
  order_prefix    VARCHAR(6)   NOT NULL DEFAULT 'DC',
  footer_name     VARCHAR(120) NULL,
  invoice_name    VARCHAR(120) NULL,
  views           INT UNSIGNED NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_landing_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS landing_id INT UNSIGNED NULL;
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_landing (landing_id, created_at);

-- One-time codes (email/SMS OTP) and reset links. Only a hash of the code is stored.
CREATE TABLE IF NOT EXISTS otp_codes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purpose      VARCHAR(30)  NOT NULL,
  channel      VARCHAR(5)   NOT NULL,
  target       VARCHAR(190) NOT NULL,
  user_id      INT UNSIGNED NULL,
  code_hash    CHAR(64)     NOT NULL,
  payload      TEXT         NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  sends        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  expires_at   DATETIME     NOT NULL,
  consumed_at  DATETIME     NULL,
  last_sent_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(64)  NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_target (target, created_at),
  INDEX idx_otp_ip (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every email / SMS the site sends (for the admin log and troubleshooting).
CREATE TABLE IF NOT EXISTS message_log (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel    VARCHAR(5)   NOT NULL,
  recipient  VARCHAR(190) NOT NULL,
  subject    VARCHAR(200) NULL,
  purpose    VARCHAR(40)  NOT NULL,
  status     VARCHAR(8)   NOT NULL,
  error      VARCHAR(500) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_msg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at DATETIME NULL;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS phone_verified_at DATETIME NULL;

-- How long the customer took to order (seconds): since opening the page, and since first touching the form
ALTER TABLE orders ADD COLUMN IF NOT EXISTS page_seconds INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_seconds INT UNSIGNED NULL;

-- Live visitors on landing pages (one row per browser + landing; heartbeats every ~15s, kept 2 days)
CREATE TABLE IF NOT EXISTS live_visitors (
  sid         CHAR(24)     NOT NULL,
  landing_id  INT UNSIGNED NOT NULL,
  section     VARCHAR(10)  NOT NULL DEFAULT 'top',
  source      VARCHAR(12)  NOT NULL DEFAULT 'direct',
  device      VARCHAR(8)   NOT NULL DEFAULT 'phone',
  first_seen  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at     DATETIME     NULL,
  PRIMARY KEY (sid, landing_id),
  INDEX idx_live_seen (last_seen),
  INDEX idx_live_first (first_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
