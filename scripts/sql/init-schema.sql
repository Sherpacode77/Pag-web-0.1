-- =============================================================================
-- CERO.UNO — Esquema de base de datos MariaDB
-- Ejecutar una vez sobre la base de datos del hosting (Hostinger / MariaDB)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- 1. CATÁLOGO DE PRODUCTOS
--    El payload JSON contiene la estructura completa del producto.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_products (
  id          VARCHAR(255) PRIMARY KEY,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  payload     JSON         NOT NULL COMMENT 'Datos completos del producto en JSON',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_products_slug    (slug),
  INDEX idx_products_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de productos CERO.UNO';


-- ---------------------------------------------------------------------------
-- 2. CLIENTES
--    Registro de compradores y contactos del sitio.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_customers (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  phone           VARCHAR(30)                      COMMENT 'Con indicativo: +573001234567',
  document_type   ENUM('cc','ce','passport','nit','other') DEFAULT 'cc'
                                                   COMMENT 'CC=Cédula, CE=Cédula extranjería',
  document_number VARCHAR(30),
  city            VARCHAR(100),
  department      VARCHAR(100)                     COMMENT 'Departamento colombiano',
  country         VARCHAR(50)  NOT NULL DEFAULT 'Colombia',
  accepts_marketing TINYINT(1) NOT NULL DEFAULT 0  COMMENT '1 si acepta comunicaciones',
  source          VARCHAR(100) DEFAULT 'website'   COMMENT 'Origen: website, admin, import',
  notes           TEXT                             COMMENT 'Notas internas del administrador',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_customers_email     (email),
  INDEX idx_customers_phone     (phone),
  INDEX idx_customers_document  (document_type, document_number),
  INDEX idx_customers_city      (city),
  INDEX idx_customers_marketing (accepts_marketing)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Base de datos de clientes y contactos';


-- ---------------------------------------------------------------------------
-- 3. DIRECCIONES DE ENVÍO
--    Un cliente puede tener varias direcciones guardadas.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_addresses (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id   BIGINT       NOT NULL,
  label         VARCHAR(100) NOT NULL DEFAULT 'Principal' COMMENT 'Casa, Trabajo, etc.',
  full_name     VARCHAR(200)           COMMENT 'Nombre del destinatario',
  phone         VARCHAR(30),
  address_line  VARCHAR(400) NOT NULL  COMMENT 'Calle, carrera, número, apartamento',
  neighborhood  VARCHAR(150)           COMMENT 'Barrio',
  city          VARCHAR(100) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  postal_code   VARCHAR(20),
  country       VARCHAR(50)  NOT NULL DEFAULT 'Colombia',
  is_default    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES app_customers(id) ON DELETE CASCADE,
  INDEX idx_addresses_customer (customer_id),
  INDEX idx_addresses_default  (customer_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Direcciones de envío por cliente';


-- ---------------------------------------------------------------------------
-- 4. PEDIDOS
--    Registro de todas las órdenes de compra.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_orders (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_number          VARCHAR(50)   NOT NULL UNIQUE COMMENT 'Ej: CO-2026-00001',
  customer_id           BIGINT                       COMMENT 'NULL si compra como invitado',
  customer_email        VARCHAR(255)  NOT NULL,
  customer_name         VARCHAR(200),
  customer_phone        VARCHAR(30),
  customer_document     VARCHAR(50),
  shipping_address      JSON                         COMMENT 'Snapshot de la dirección al momento del pedido',
  status                ENUM(
                          'pending',       -- Pendiente de pago
                          'paid',          -- Pago confirmado
                          'processing',    -- En preparación
                          'shipped',       -- Enviado
                          'delivered',     -- Entregado
                          'cancelled',     -- Cancelado
                          'refunded'       -- Reembolsado
                        ) NOT NULL DEFAULT 'pending',
  payment_method        VARCHAR(50)                  COMMENT 'mercadopago, transferencia, etc.',
  payment_reference     VARCHAR(200)                 COMMENT 'Referencia interna del pago',
  mercadopago_id        VARCHAR(100)                 COMMENT 'ID de pago en MercadoPago',
  mercadopago_status    VARCHAR(50)                  COMMENT 'approved, pending, rejected',
  tracking_number       VARCHAR(100)                 COMMENT 'Número de guía de envío',
  carrier               VARCHAR(100)                 COMMENT 'Transportadora: Servientrega, etc.',
  subtotal              DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_cost         DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount              DECIMAL(15,2) NOT NULL DEFAULT 0,
  total                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency              VARCHAR(10)   NOT NULL DEFAULT 'COP',
  notes                 TEXT                         COMMENT 'Notas del cliente',
  admin_notes           TEXT                         COMMENT 'Notas internas del administrador',
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES app_customers(id) ON DELETE SET NULL,
  INDEX idx_orders_number      (order_number),
  INDEX idx_orders_customer    (customer_id),
  INDEX idx_orders_email       (customer_email),
  INDEX idx_orders_status      (status),
  INDEX idx_orders_mp          (mercadopago_id),
  INDEX idx_orders_created     (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pedidos y órdenes de compra';


-- ---------------------------------------------------------------------------
-- 5. ÍTEMS DE PEDIDO
--    Líneas de producto dentro de cada pedido.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_order_items (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id          BIGINT        NOT NULL,
  product_id        VARCHAR(255)  NOT NULL,
  product_name      VARCHAR(200)  NOT NULL,
  product_slug      VARCHAR(255),
  variant_color     VARCHAR(50)                COMMENT 'negro, rojo, verde...',
  variant_color_name VARCHAR(100)              COMMENT 'Negro mate, Rojo fuego...',
  unit_price        DECIMAL(15,2) NOT NULL,
  quantity          INT           NOT NULL DEFAULT 1,
  subtotal          DECIMAL(15,2) NOT NULL,
  product_snapshot  JSON                       COMMENT 'Datos del producto al momento de la compra',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES app_orders(id) ON DELETE CASCADE,
  INDEX idx_items_order   (order_id),
  INDEX idx_items_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Líneas de producto por pedido';


-- ---------------------------------------------------------------------------
-- 6. SUSCRIPTORES DE NEWSLETTER
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_newsletter_subscribers (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(200),
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  source        VARCHAR(100) DEFAULT 'website'   COMMENT 'Origen: footer, popup, checkout',
  subscribed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME                       COMMENT 'Fecha de baja, si aplica',

  INDEX idx_newsletter_email  (email),
  INDEX idx_newsletter_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Suscriptores al boletín de noticias';


-- ---------------------------------------------------------------------------
-- 7. MENSAJES DE CONTACTO
--    Formulario de contacto del sitio.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_contact_messages (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  subject     VARCHAR(300),
  message     TEXT         NOT NULL,
  status      ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  ip_address  VARCHAR(45)                COMMENT 'Para control de spam',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_contact_email   (email),
  INDEX idx_contact_status  (status),
  INDEX idx_contact_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mensajes del formulario de contacto';


-- ---------------------------------------------------------------------------
-- 8. INVENTARIO POR VARIANTE
--    Una fila por cada combinación producto + color (+ talla en ropa).
--    Cada fila tiene un SKU único de exactamente 7 caracteres:
--      [Letra del producto] + [3 dígitos del ID] + [3 caracteres de variante]
--    Ejemplo: S001NEG = SaddleBag 12L, Negro
--             C004NGM = Camiseta Oversize, Negro, Talla M
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_inventory (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku                 VARCHAR(7)    NOT NULL UNIQUE   COMMENT 'Identificador único de 7 caracteres',
  product_id          VARCHAR(255)  NOT NULL          COMMENT 'FK a app_products.id',
  variant_color       VARCHAR(50)   NULL              COMMENT 'Clave de color: negro, rojo, verde-oliva...',
  variant_color_name  VARCHAR(100)  NULL              COMMENT 'Nombre visible: Negro, Verde Oliva...',
  variant_size        VARCHAR(10)   NULL              COMMENT 'Talla (ropa): S, M, L, XL — NULL si no aplica',
  stock_quantity      INT           NOT NULL DEFAULT 0,
  ideal_quantity      INT           NOT NULL DEFAULT 0  COMMENT 'Stock objetivo para operar con normalidad',
  low_stock_threshold INT           NOT NULL DEFAULT 3  COMMENT 'Alerta cuando el stock baja de este número',
  is_available        TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '0 = oculto aunque haya stock',
  cost_price          DECIMAL(15,2) NULL              COMMENT 'Precio de costo para cálculo de margen',
  notes               VARCHAR(300)  NULL              COMMENT 'Notas internas sobre esta variante',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (product_id) REFERENCES app_products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_inventory_product_variant (product_id, variant_color, variant_size),
  INDEX idx_inventory_product   (product_id),
  INDEX idx_inventory_sku       (sku),
  INDEX idx_inventory_stock     (stock_quantity),
  INDEX idx_inventory_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inventario por variante con SKU único de 7 caracteres';


-- ---------------------------------------------------------------------------
-- 9. CUPONES Y DESCUENTOS
--     Gestión de códigos promocionales con porcentaje o valor fijo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_coupons (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  code                   VARCHAR(30)   NOT NULL UNIQUE COMMENT 'Código del cupón: BIKE20, VERANO10...',
  description            VARCHAR(200)           COMMENT 'Descripción interna del cupón',
  discount_type          ENUM('percentage','fixed') NOT NULL COMMENT 'percentage=%, fixed=COP fijo',
  discount_value         DECIMAL(15,2) NOT NULL        COMMENT 'Valor: 20 = 20% ó 20000 = $20.000 COP',
  min_order_amount       DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Pedido mínimo para aplicar el cupón',
  max_discount_amount    DECIMAL(15,2) NULL            COMMENT 'Tope máximo en COP (solo para porcentajes)',
  max_uses               INT           NULL            COMMENT 'NULL = usos ilimitados',
  uses_count             INT           NOT NULL DEFAULT 0,
  max_uses_per_customer  INT           NOT NULL DEFAULT 1,
  applies_to             ENUM('all','category','product') NOT NULL DEFAULT 'all',
  applies_to_value       VARCHAR(255)  NULL            COMMENT 'Slug de categoría o producto, si aplica',
  valid_from             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until            DATETIME      NULL            COMMENT 'NULL = sin fecha de expiración',
  is_active              TINYINT(1)    NOT NULL DEFAULT 1,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_coupons_code    (code),
  INDEX idx_coupons_active  (is_active),
  INDEX idx_coupons_valid   (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cupones y códigos de descuento';


-- ---------------------------------------------------------------------------
-- 10. HISTORIAL DE ESTADOS DEL PEDIDO
--     Registro de auditoría de cada cambio de estado, quién lo hizo y cuándo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_order_status_history (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT        NOT NULL,
  order_number VARCHAR(50)   NOT NULL         COMMENT 'Copia para búsquedas sin JOIN',
  from_status  VARCHAR(20)   NULL             COMMENT 'NULL en el primer registro (creación)',
  to_status    VARCHAR(20)   NOT NULL,
  changed_by   VARCHAR(100)  NOT NULL DEFAULT 'system' COMMENT 'admin, system, mercadopago, webhook',
  note         TEXT          NULL             COMMENT 'Detalles del cambio: guía, referencia, etc.',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES app_orders(id) ON DELETE CASCADE,
  INDEX idx_status_history_order   (order_id),
  INDEX idx_status_history_number  (order_number),
  INDEX idx_status_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de cambios de estado por pedido';


-- ---------------------------------------------------------------------------
-- Fin del esquema — CERO.UNO
-- ---------------------------------------------------------------------------
