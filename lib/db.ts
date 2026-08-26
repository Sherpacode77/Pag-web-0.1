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
    CREATE TABLE IF NOT EXISTS app_products (
      id         VARCHAR(255) PRIMARY KEY,
      slug       VARCHAR(255) NOT NULL UNIQUE,
      payload    JSON         NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Migración segura: prefijo y sufijo de SKU exclusivos por producto (ver lib/db-inventory.ts)
  await pool.execute(`
    ALTER TABLE app_products
    ADD COLUMN IF NOT EXISTS sku_prefix CHAR(2) NULL,
    ADD COLUMN IF NOT EXISTS sku_suffix CHAR(3) NULL
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
      variant_size       VARCHAR(10)   NULL,
      variant_size_name  VARCHAR(20)   NULL,
      variant_design_name VARCHAR(100) NULL,
      unit_price         DECIMAL(15,2) NOT NULL,
      quantity           INT           NOT NULL DEFAULT 1,
      subtotal           DECIMAL(15,2) NOT NULL,
      product_snapshot   JSON          NULL,
      created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES app_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Migración segura: agrega columnas de talla si la tabla ya existía sin ellas
  await pool.execute(`
    ALTER TABLE app_order_items
    ADD COLUMN IF NOT EXISTS variant_size VARCHAR(10) NULL AFTER variant_color_name
  `)
  await pool.execute(`
    ALTER TABLE app_order_items
    ADD COLUMN IF NOT EXISTS variant_size_name VARCHAR(20) NULL AFTER variant_size
  `)
  await pool.execute(`
    ALTER TABLE app_order_items
    ADD COLUMN IF NOT EXISTS variant_design_name VARCHAR(100) NULL AFTER variant_size_name
  `)

  // Migración segura: el email del cliente se completa recién cuando MercadoPago
  // confirma el pago (el checkout actual no pide datos de contacto antes de pagar)
  await pool.execute(`
    ALTER TABLE app_orders
    MODIFY COLUMN customer_email VARCHAR(255) NULL
  `)

  // Nombre de campaña de Meta resuelto desde app_whatsapp_referrals (via el
  // codigo corto guardado en localStorage por captureAdClickAttribution, ver
  // lib/whatsapp-attribution.ts) -- NULL si el pedido no vino de un anuncio.
  await pool.execute(`
    ALTER TABLE app_orders
    ADD COLUMN IF NOT EXISTS ad_campaign VARCHAR(150) NULL
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
      ideal_quantity      INT           NOT NULL DEFAULT 0,
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

  // Migración segura: agrega ideal_quantity si la tabla ya existía sin ella
  await pool.execute(`
    ALTER TABLE app_inventory
    ADD COLUMN IF NOT EXISTS ideal_quantity INT NOT NULL DEFAULT 0
    AFTER stock_quantity
  `)

  // Migración segura: amplía sku a 8 caracteres (4 letras + 4 dígitos).
  // MODIFY COLUMN es idempotente por naturaleza — no falla si ya está en VARCHAR(8).
  await pool.execute(`
    ALTER TABLE app_inventory
    MODIFY COLUMN sku VARCHAR(8) NOT NULL
  `)

  // 9b. FK → app_inventory — SKUs alias (códigos externos que representan la misma variante)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_inventory_sku_aliases (
      id           BIGINT AUTO_INCREMENT PRIMARY KEY,
      inventory_id BIGINT       NOT NULL,
      alias_sku    VARCHAR(100) NOT NULL,
      source       VARCHAR(100) NULL,
      notes        VARCHAR(300) NULL,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES app_inventory(id) ON DELETE CASCADE,
      UNIQUE KEY uq_inventory_alias_sku (alias_sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 9c. Sin dependencias FK — registro global de códigos numéricos de variante
  // (identidad color/talla → código de 3 dígitos, exclusivo en todo el catálogo)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_sku_variant_codes (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      variant_key VARCHAR(191) NOT NULL UNIQUE,
      code        CHAR(3)      NOT NULL UNIQUE,
      label       VARCHAR(150) NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  // 12. Estado de servicios (health checks periodicos del sitio)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_service_status (
      service_id           VARCHAR(64)   NOT NULL PRIMARY KEY,
      service_name         VARCHAR(120)  NOT NULL,
      status                ENUM('ok','degraded','failing','unknown') NOT NULL DEFAULT 'unknown',
      last_checked_at       DATETIME      NULL,
      last_ok_at            DATETIME      NULL,
      last_failure_at       DATETIME      NULL,
      error_type            VARCHAR(64)   NULL,
      error_message         TEXT          NULL,
      response_time_ms      INT           NULL,
      consecutive_failures  INT           NOT NULL DEFAULT 0,
      updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Migración segura: agrega el estado "degraded" (naranja) para servicios con fallas parciales.
  // MODIFY COLUMN es idempotente por naturaleza — no falla si ya incluye 'degraded'.
  await pool.execute(`
    ALTER TABLE app_service_status
    MODIFY COLUMN status ENUM('ok','degraded','failing','unknown') NOT NULL DEFAULT 'unknown'
  `)

  // 13. Atribucion de ventas cerradas por WhatsApp: se genera un codigo corto
  // cuando un visitante llega desde un anuncio, y se agrega como referencia
  // al mensaje de WhatsApp que se abre, para poder registrar despues a que
  // campana corresponde la venta cerrada fuera del sitio.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_whatsapp_referrals (
      id            BIGINT AUTO_INCREMENT PRIMARY KEY,
      code          VARCHAR(10)   NOT NULL UNIQUE,
      utm_source    VARCHAR(100)  NULL,
      utm_campaign  VARCHAR(150)  NULL,
      utm_medium    VARCHAR(100)  NULL,
      fbclid        VARCHAR(255)  NULL,
      gclid         VARCHAR(255)  NULL,
      ttclid        VARCHAR(255)  NULL,
      landing_page  VARCHAR(500)  NULL,
      created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 14. Ventas registradas manualmente por el equipo cuando se cierran por
  // WhatsApp en vez del checkout del sitio. referral_code es opcional --
  // referencia a app_whatsapp_referrals.code, sin FK (el registro puede
  // hacerse aunque no se tenga o encuentre el codigo).
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_whatsapp_sales (
      id             BIGINT AUTO_INCREMENT PRIMARY KEY,
      referral_code  VARCHAR(10)    NULL,
      channel        ENUM('meta','google','tiktok','organico','otro') NOT NULL DEFAULT 'otro',
      campaign_name  VARCHAR(150)   NULL,
      amount         DECIMAL(15,2)  NOT NULL,
      customer_name  VARCHAR(200)   NULL,
      note           TEXT           NULL,
      sale_date      DATE           NOT NULL,
      created_by     VARCHAR(100)   NULL,
      created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await createIndexSafe(pool, "CREATE INDEX idx_app_products_slug ON app_products(slug)")
  await createIndexSafe(pool, "CREATE UNIQUE INDEX uq_app_products_sku_prefix ON app_products(sku_prefix)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_customers_email ON app_customers(email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_customers_phone ON app_customers(phone)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_number ON app_orders(order_number)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_customer ON app_orders(customer_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_email ON app_orders(customer_email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_status ON app_orders(status)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_orders_mp ON app_orders(mercadopago_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_inventory_product ON app_inventory(product_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_inventory_stock ON app_inventory(stock_quantity)")
  await createIndexSafe(pool, "CREATE INDEX idx_inventory_aliases_inventory ON app_inventory_sku_aliases(inventory_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_coupons_code ON app_coupons(code)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_coupons_active ON app_coupons(is_active)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_order_history_order ON app_order_status_history(order_id)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_newsletter_email ON app_newsletter_subscribers(email)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_contact_status ON app_contact_messages(status)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_contact_created ON app_contact_messages(created_at)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_service_status_status ON app_service_status(status)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_whatsapp_sales_channel_date ON app_whatsapp_sales(channel, sale_date)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_whatsapp_sales_referral ON app_whatsapp_sales(referral_code)")

  // 15. Ofertas (referencia unica con % o envio gratis, o combos de varios
  // productos mostrados como vitrina informativa). "products" guarda
  // [{productId, variantColors[], quantity}] como JSON -- no hay tabla
  // normalizada porque la cantidad de productos por oferta es variable y no
  // se necesita hacer queries relacionales sobre ese contenido.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_offers (
      id             BIGINT AUTO_INCREMENT PRIMARY KEY,
      name           VARCHAR(200)  NOT NULL,
      description    TEXT          NULL,
      offer_type     ENUM('single','bundle') NOT NULL,
      discount_type  ENUM('percentage','free_shipping') NOT NULL,
      discount_value DECIMAL(5,2)  NULL,
      cover_image    VARCHAR(500)  NULL,
      products       JSON          NOT NULL,
      is_active      TINYINT(1)    NOT NULL DEFAULT 1,
      valid_from     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_until    DATETIME      NULL,
      created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await createIndexSafe(pool, "CREATE INDEX idx_app_offers_active ON app_offers(is_active)")
  await createIndexSafe(pool, "CREATE INDEX idx_app_offers_type ON app_offers(offer_type, discount_type)")

  // 16. Leads del cupon de bienvenida (suscripcion "10% OFF en tu primera
  // aventura"). El cupon asociado se crea inactivo y solo se activa cuando
  // el lead completa el formulario corto (nombre, cedula, WhatsApp, consentimiento)
  // desde el link del correo -- ver lib/db-welcome-coupon.ts. Los UNIQUE en
  // email y document garantizan un solo cupon por persona a nivel de BD.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_welcome_coupon_leads (
      id                BIGINT AUTO_INCREMENT PRIMARY KEY,
      email             VARCHAR(255)  NOT NULL UNIQUE,
      document          VARCHAR(50)   NULL UNIQUE,
      full_name         VARCHAR(200)  NULL,
      whatsapp          VARCHAR(30)   NULL,
      data_consent_at   DATETIME      NULL,
      coupon_id         BIGINT        NOT NULL,
      activation_token  VARCHAR(64)   NOT NULL UNIQUE,
      activated_at      DATETIME      NULL,
      created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES app_coupons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await createIndexSafe(pool, "CREATE INDEX idx_welcome_leads_token ON app_welcome_coupon_leads(activation_token)")
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
