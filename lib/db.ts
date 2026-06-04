import mysql, { type Pool, type PoolConnection } from "mysql2/promise"

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined
}

function parseSslFlag(value: string | undefined) {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada")
  }

  const socketPath = process.env.DB_SOCKET_PATH
  const poolBase = {
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_MAX ?? 10),
    connectTimeout: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 10000),
  }

  // Conexión por socket Unix — evita problemas IPv4/IPv6 en hosting compartido
  if (socketPath) {
    const url = new URL(connectionString)
    return mysql.createPool({
      ...poolBase,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      socketPath,
    })
  }

  const rejectUnauthorized = parseSslFlag(process.env.DB_SSL_REJECT_UNAUTHORIZED)
  const sslDisabled = process.env.DB_SSL === "false"

  return mysql.createPool({
    ...poolBase,
    uri: connectionString,
    ...(!sslDisabled && {
      ssl: { rejectUnauthorized },
    }),
  })
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL)
}

export function getDbPool() {
  if (!global.__dbPool) {
    global.__dbPool = createPool()
  }
  return global.__dbPool
}

export async function withTransaction<T>(fn: (client: PoolConnection) => Promise<T>) {
  const conn = await getDbPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

let schemaInitPromise: Promise<void> | null = null

async function createIndexSafe(pool: Pool, sql: string) {
  try {
    await pool.execute(sql)
  } catch (err: unknown) {
    // ER_DUP_KEYNAME (1061): el índice ya existe — es seguro ignorarlo
    if ((err as NodeJS.ErrnoException & { errno?: number }).errno !== 1061) throw err
  }
}

async function runSchemaSetup() {
  const pool = getDbPool()

  // 1. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_media_assets (
      id               BIGINT AUTO_INCREMENT PRIMARY KEY,
      asset_path       VARCHAR(600)  NOT NULL UNIQUE,
      file_name        VARCHAR(255)  NOT NULL,
      content_type     VARCHAR(100)  NOT NULL,
      kind             ENUM('image','video','logo','infographic','schema') NOT NULL DEFAULT 'image',
      alt_text         VARCHAR(500)  NULL,
      size_bytes       BIGINT        NOT NULL,
      duration_seconds INT           NULL,
      thumbnail_path   VARCHAR(600)  NULL,
      created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 2. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_products (
      id         VARCHAR(255) PRIMARY KEY,
      slug       VARCHAR(255) NOT NULL UNIQUE,
      payload    JSON         NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 3. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_customers (
      id                BIGINT AUTO_INCREMENT PRIMARY KEY,
      email             VARCHAR(255) NOT NULL UNIQUE,
      first_name        VARCHAR(100) NULL,
      last_name         VARCHAR(100) NULL,
      phone             VARCHAR(30)  NULL,
      document_type     ENUM('cc','ce','passport','nit','other') DEFAULT 'cc',
      document_number   VARCHAR(30)  NULL,
      city              VARCHAR(100) NULL,
      department        VARCHAR(100) NULL,
      country           VARCHAR(50)  NOT NULL DEFAULT 'Colombia',
      accepts_marketing TINYINT(1)   NOT NULL DEFAULT 0,
      source            VARCHAR(100) DEFAULT 'website',
      notes             TEXT         NULL,
      created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 4. FK → app_customers
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_addresses (
      id           BIGINT AUTO_INCREMENT PRIMARY KEY,
      customer_id  BIGINT       NOT NULL,
      label        VARCHAR(100) NOT NULL DEFAULT 'Principal',
      full_name    VARCHAR(200) NULL,
      phone        VARCHAR(30)  NULL,
      address_line VARCHAR(400) NOT NULL,
      neighborhood VARCHAR(150) NULL,
      city         VARCHAR(100) NOT NULL,
      department   VARCHAR(100) NOT NULL,
      postal_code  VARCHAR(20)  NULL,
      country      VARCHAR(50)  NOT NULL DEFAULT 'Colombia',
      is_default   TINYINT(1)   NOT NULL DEFAULT 0,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES app_customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 5. FK → app_customers (SET NULL al borrar cliente)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_orders (
      id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_number       VARCHAR(50)   NOT NULL UNIQUE,
      customer_id        BIGINT        NULL,
      customer_email     VARCHAR(255)  NOT NULL,
      customer_name      VARCHAR(200)  NULL,
      customer_phone     VARCHAR(30)   NULL,
      customer_document  VARCHAR(50)   NULL,
      shipping_address   JSON          NULL,
      status             ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
      payment_method     VARCHAR(50)   NULL,
      payment_reference  VARCHAR(200)  NULL,
      mercadopago_id     VARCHAR(100)  NULL,
      mercadopago_status VARCHAR(50)   NULL,
      tracking_number    VARCHAR(100)  NULL,
      carrier            VARCHAR(100)  NULL,
      subtotal           DECIMAL(15,2) NOT NULL DEFAULT 0,
      shipping_cost      DECIMAL(15,2) NOT NULL DEFAULT 0,
      discount           DECIMAL(15,2) NOT NULL DEFAULT 0,
      total              DECIMAL(15,2) NOT NULL DEFAULT 0,
      currency           VARCHAR(10)   NOT NULL DEFAULT 'COP',
      notes              TEXT          NULL,
      admin_notes        TEXT          NULL,
      created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES app_customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 6. FK → app_orders
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_order_items (
      id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id           BIGINT        NOT NULL,
      product_id         VARCHAR(255)  NOT NULL,
      product_name       VARCHAR(200)  NOT NULL,
      product_slug       VARCHAR(255)  NULL,
      variant_color      VARCHAR(50)   NULL,
      variant_color_name VARCHAR(100)  NULL,
      unit_price         DECIMAL(15,2) NOT NULL,
      quantity           INT           NOT NULL DEFAULT 1,
      subtotal           DECIMAL(15,2) NOT NULL,
      product_snapshot   JSON          NULL,
      created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES app_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 7. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_newsletter_subscribers (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      email           VARCHAR(255) NOT NULL UNIQUE,
      name            VARCHAR(200) NULL,
      is_active       TINYINT(1)   NOT NULL DEFAULT 1,
      source          VARCHAR(100) DEFAULT 'website',
      subscribed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at DATETIME     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 8. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_contact_messages (
      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(200) NOT NULL,
      email      VARCHAR(255) NOT NULL,
      phone      VARCHAR(30)  NULL,
      subject    VARCHAR(300) NULL,
      message    TEXT         NOT NULL,
      status     ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
      ip_address VARCHAR(45)  NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 9. FK → app_products
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_inventory (
      id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
      sku                 VARCHAR(7)    NOT NULL UNIQUE,
      product_id          VARCHAR(255)  NOT NULL,
      variant_color       VARCHAR(50)   NULL,
      variant_color_name  VARCHAR(100)  NULL,
      variant_size        VARCHAR(10)   NULL,
      stock_quantity      INT           NOT NULL DEFAULT 0,
      low_stock_threshold INT           NOT NULL DEFAULT 3,
      is_available        TINYINT(1)    NOT NULL DEFAULT 1,
      cost_price          DECIMAL(15,2) NULL,
      notes               VARCHAR(300)  NULL,
      created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES app_products(id) ON DELETE CASCADE,
      UNIQUE KEY uq_inventory_product_variant (product_id, variant_color, variant_size)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 10. Sin dependencias FK
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_coupons (
      id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
      code                  VARCHAR(30)   NOT NULL UNIQUE,
      description           VARCHAR(200)  NULL,
      discount_type         ENUM('percentage','fixed') NOT NULL,
      discount_value        DECIMAL(15,2) NOT NULL,
      min_order_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
      max_discount_amount   DECIMAL(15,2) NULL,
      max_uses              INT           NULL,
      uses_count            INT           NOT NULL DEFAULT 0,
      max_uses_per_customer INT           NOT NULL DEFAULT 1,
      applies_to            ENUM('all','category','product') NOT NULL DEFAULT 'all',
      applies_to_value      VARCHAR(255)  NULL,
      valid_from            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_until           DATETIME      NULL,
      is_active             TINYINT(1)    NOT NULL DEFAULT 1,
      created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 11. FK → app_orders (debe ir DESPUÉS de app_orders)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_order_status_history (
      id           BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id     BIGINT        NOT NULL,
      order_number VARCHAR(50)   NOT NULL,
      from_status  VARCHAR(20)   NULL,
      to_status    VARCHAR(20)   NOT NULL,
      changed_by   VARCHAR(100)  NOT NULL DEFAULT 'system',
      note         TEXT          NULL,
      created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES app_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await createIndexSafe(pool, "CREATE INDEX idx_app_products_slug ON app_products(slug)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_media_assets_kind ON app_media_assets(kind)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_customers_email ON app_customers(email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_customers_phone ON app_customers(phone)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_number ON app_orders(order_number)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_customer ON app_orders(customer_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_email ON app_orders(customer_email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_status ON app_orders(status)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_mp ON app_orders(mercadopago_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_inventory_product ON app_inventory(product_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_inventory_stock ON app_inventory(stock_quantity)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_coupons_code ON app_coupons(code)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_coupons_active ON app_coupons(is_active)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_order_history_order ON app_order_status_history(order_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_newsletter_email ON app_newsletter_subscribers(email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_contact_status ON app_contact_messages(status)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_contact_created ON app_contact_messages(created_at)")
}

export async function ensureDbSchema() {
  if (schemaInitPromise) {
    return schemaInitPromise
  }

  schemaInitPromise = runSchemaSetup().catch((error) => {
    schemaInitPromise = null
    throw error
  })

  return schemaInitPromise
}
