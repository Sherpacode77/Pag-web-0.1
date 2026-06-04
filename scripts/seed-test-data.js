/* eslint-disable no-console */
/**
 * CERO.UNO — Script de datos de prueba
 *
 * Pobla todas las tablas con información de ejemplo para verificar
 * que la conexión y el esquema de MariaDB funcionan correctamente.
 *
 * Uso:
 *   node scripts/seed-test-data.js
 *   node scripts/seed-test-data.js --clean   (borra datos de prueba primero)
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL=mysql://usuario:contraseña@localhost:3306/nombre_db
 *   DB_SSL=false
 */

const fs = require("fs")
const path = require("path")

const args  = process.argv.slice(2)
const clean = args.includes("--clean")

// ─── Conexión ──────────────────────────────────────────────────────────────────
async function getConnection() {
  let mysql
  try {
    mysql = require("mysql2/promise")
  } catch {
    console.error("❌  mysql2 no está instalado. Ejecuta: pnpm install")
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌  DATABASE_URL no está configurada en tu .env.local")
    process.exit(1)
  }

  const sslDisabled = process.env.DB_SSL === "false"
  return mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: false,
    ...(!sslDisabled && {
      ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
    }),
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function orderNumber(n) {
  return `CO-2026-${String(n).padStart(5, "0")}`
}

// ─── Limpiar datos de prueba (opcional) ────────────────────────────────────────
async function cleanTestData(conn) {
  console.log("\n🗑️   Eliminando datos de prueba anteriores...")
  await conn.execute("DELETE FROM app_order_status_history WHERE changed_by = 'seed-test'")
  await conn.execute("DELETE FROM app_order_items WHERE product_id LIKE 'TEST-%'")
  await conn.execute("DELETE FROM app_orders WHERE order_number LIKE 'CO-2026-%'")
  await conn.execute("DELETE FROM app_addresses WHERE label LIKE 'TEST%'")
  await conn.execute("DELETE FROM app_customers WHERE source = 'seed-test'")
  await conn.execute("DELETE FROM app_newsletter_subscribers WHERE source = 'seed-test'")
  await conn.execute("DELETE FROM app_contact_messages WHERE subject LIKE '[TEST]%'")
  await conn.execute("DELETE FROM app_media_assets WHERE asset_path LIKE '/images/products/test-%'")
  await conn.execute("DELETE FROM app_inventory WHERE sku IS NOT NULL")
  await conn.execute("DELETE FROM app_coupons WHERE code LIKE 'TEST%' OR code IN ('BIKE20','VERANO15','FIRSTRIDE','KITDEAL')")
  await conn.execute("DELETE FROM app_products WHERE id LIKE 'TEST-%'")
  console.log("✅  Limpieza completada.")
}

// ─── 1. Productos ──────────────────────────────────────────────────────────────
async function seedProducts(conn) {
  console.log("\n📦  Insertando productos de prueba...")

  // Leer products.json si existe, y usarlos como base
  const jsonPath = path.join(process.cwd(), "lib", "products.json")
  let existingProducts = []
  if (fs.existsSync(jsonPath)) {
    existingProducts = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))
  }

  // Migrar productos reales del JSON
  let upserted = 0
  for (const p of existingProducts) {
    await conn.execute(
      `INSERT INTO app_products (id, slug, payload, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         slug       = VALUES(slug),
         payload    = VALUES(payload),
         updated_at = NOW()`,
      [String(p.id), p.slug, JSON.stringify(p)]
    )
    upserted++
  }

  // Producto extra de prueba con prefijo TEST- para identificarlo
  const testProduct = {
    id: "TEST-1",
    slug: "test-bolso-prueba",
    name: "Bolso de Prueba CERO.UNO",
    price: 99000,
    originalPrice: 120000,
    description: "Producto de prueba para verificar la conexión con MariaDB. No publicar en producción.",
    shortDescription: "Producto de prueba — solo para QA",
    image: "/images/products/test-bolso.jpg",
    images: ["/images/products/test-bolso.jpg"],
    category: "alforjas",
    bikePart: "sillin",
    tags: ["prueba", "test", "qa"],
    colors: ["Negro"],
    featured: false,
    bestSeller: false,
    hasVariants: false,
    variants: [],
    specs: [
      { label: "Capacidad", value: "10L" },
      { label: "Material", value: "Nylon 420D" },
    ],
  }

  await conn.execute(
    `INSERT INTO app_products (id, slug, payload, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       slug       = VALUES(slug),
       payload    = VALUES(payload),
       updated_at = NOW()`,
    [testProduct.id, testProduct.slug, JSON.stringify(testProduct)]
  )

  console.log(`✅  ${upserted} producto(s) reales + 1 producto TEST migrados.`)
}

// ─── 2. Metadatos de activos multimedia ────────────────────────────────────────
async function seedMediaAssets(conn) {
  console.log("\n🖼️   Insertando metadatos de activos multimedia...")

  const assets = [
    {
      assetPath: "/images/products/test-saddlebag-negro.jpg",
      fileName: "test-saddlebag-negro.jpg",
      contentType: "image/jpeg",
      kind: "image",
      sizeBytes: 245760,
    },
    {
      assetPath: "/images/products/test-frontbag-verde.jpg",
      fileName: "test-frontbag-verde.jpg",
      contentType: "image/jpeg",
      kind: "image",
      sizeBytes: 187392,
    },
    {
      assetPath: "/videos/products/test-demo-saddlebag.mp4",
      fileName: "test-demo-saddlebag.mp4",
      contentType: "video/mp4",
      kind: "video",
      sizeBytes: 38400000,
      durationSeconds: 45,
      thumbnailPath: "/images/products/test-thumb-saddlebag.jpg",
    },
  ]

  for (const a of assets) {
    await conn.execute(
      `INSERT INTO app_media_assets
         (asset_path, file_name, content_type, kind, size_bytes, duration_seconds, thumbnail_path, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         file_name        = VALUES(file_name),
         size_bytes       = VALUES(size_bytes),
         duration_seconds = VALUES(duration_seconds),
         thumbnail_path   = VALUES(thumbnail_path),
         updated_at       = NOW()`,
      [
        a.assetPath,
        a.fileName,
        a.contentType,
        a.kind,
        a.sizeBytes,
        a.durationSeconds ?? null,
        a.thumbnailPath ?? null,
      ]
    )
  }

  console.log(`✅  ${assets.length} registros de metadatos insertados (sin binarios).`)
}

// ─── 3. Clientes ───────────────────────────────────────────────────────────────
async function seedCustomers(conn) {
  console.log("\n👥  Insertando clientes de prueba...")

  const customers = [
    {
      email: "carlos.rueda@test.co",
      firstName: "Carlos",
      lastName: "Rueda Montoya",
      phone: "+573001234567",
      documentType: "cc",
      documentNumber: "1020304050",
      city: "Medellín",
      department: "Antioquia",
      acceptsMarketing: 1,
    },
    {
      email: "ana.bernal@test.co",
      firstName: "Ana",
      lastName: "Bernal Torres",
      phone: "+573109876543",
      documentType: "cc",
      documentNumber: "43210987",
      city: "Bogotá",
      department: "Cundinamarca",
      acceptsMarketing: 1,
    },
    {
      email: "juan.ospina@test.co",
      firstName: "Juan",
      lastName: "Ospina Giraldo",
      phone: "+573156667788",
      documentType: "cc",
      documentNumber: "71234567",
      city: "Pereira",
      department: "Risaralda",
      acceptsMarketing: 0,
    },
    {
      email: "lucia.vargas@test.co",
      firstName: "Lucía",
      lastName: "Vargas Patiño",
      phone: "+573204445566",
      documentType: "cc",
      documentNumber: "52345678",
      city: "Cali",
      department: "Valle del Cauca",
      acceptsMarketing: 1,
    },
  ]

  const ids = []
  for (const c of customers) {
    await conn.execute(
      `INSERT INTO app_customers
         (email, first_name, last_name, phone, document_type, document_number,
          city, department, country, accepts_marketing, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Colombia', ?, 'seed-test', NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         first_name        = VALUES(first_name),
         last_name         = VALUES(last_name),
         phone             = VALUES(phone),
         accepts_marketing = VALUES(accepts_marketing),
         updated_at        = NOW()`,
      [
        c.email, c.firstName, c.lastName, c.phone,
        c.documentType, c.documentNumber,
        c.city, c.department, c.acceptsMarketing,
      ]
    )
    const [[row]] = await conn.execute(
      "SELECT id FROM app_customers WHERE email = ?",
      [c.email]
    )
    ids.push(row.id)
  }

  console.log(`✅  ${customers.length} clientes insertados.`)
  return ids
}

// ─── 4. Direcciones de envío ────────────────────────────────────────────────────
async function seedAddresses(conn, customerIds) {
  console.log("\n📍  Insertando direcciones de envío...")

  const addresses = [
    {
      customerId: customerIds[0],
      label: "TEST-Casa",
      fullName: "Carlos Rueda Montoya",
      phone: "+573001234567",
      addressLine: "Calle 10 # 43A-12, Apto 301",
      neighborhood: "El Poblado",
      city: "Medellín",
      department: "Antioquia",
      postalCode: "050021",
      isDefault: 1,
    },
    {
      customerId: customerIds[1],
      label: "TEST-Casa",
      fullName: "Ana Bernal Torres",
      phone: "+573109876543",
      addressLine: "Carrera 15 # 85-32",
      neighborhood: "Chapinero Alto",
      city: "Bogotá",
      department: "Cundinamarca",
      postalCode: "110231",
      isDefault: 1,
    },
    {
      customerId: customerIds[2],
      label: "TEST-Trabajo",
      fullName: "Juan Ospina Giraldo",
      phone: "+573156667788",
      addressLine: "Av. Circunvalar # 6-37, Oficina 202",
      neighborhood: "Centro",
      city: "Pereira",
      department: "Risaralda",
      postalCode: "660001",
      isDefault: 1,
    },
    {
      customerId: customerIds[3],
      label: "TEST-Casa",
      fullName: "Lucía Vargas Patiño",
      phone: "+573204445566",
      addressLine: "Calle 5 # 38A-14",
      neighborhood: "Granada",
      city: "Cali",
      department: "Valle del Cauca",
      postalCode: "760001",
      isDefault: 1,
    },
  ]

  for (const a of addresses) {
    await conn.execute(
      `INSERT INTO app_addresses
         (customer_id, label, full_name, phone, address_line, neighborhood,
          city, department, postal_code, country, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Colombia', ?, NOW(), NOW())`,
      [
        a.customerId, a.label, a.fullName, a.phone,
        a.addressLine, a.neighborhood, a.city, a.department,
        a.postalCode, a.isDefault,
      ]
    )
  }

  console.log(`✅  ${addresses.length} direcciones insertadas.`)
}

// ─── 5. Pedidos y sus ítems ────────────────────────────────────────────────────
async function seedOrders(conn, customerIds) {
  console.log("\n🛒  Insertando pedidos de prueba...")

  const orders = [
    {
      orderNumber: orderNumber(1),
      customerId: customerIds[0],
      customerEmail: "carlos.rueda@test.co",
      customerName: "Carlos Rueda Montoya",
      customerPhone: "+573001234567",
      status: "delivered",
      paymentMethod: "mercadopago",
      paymentReference: "MP-TEST-001",
      mercadopagoId: "1234567890",
      mercadopagoStatus: "approved",
      trackingNumber: "SRV-2026-000001",
      carrier: "Servientrega",
      subtotal: 180000,
      shippingCost: 12000,
      discount: 0,
      total: 192000,
      shippingAddress: {
        fullName: "Carlos Rueda Montoya",
        addressLine: "Calle 10 # 43A-12, Apto 301",
        neighborhood: "El Poblado",
        city: "Medellín",
        department: "Antioquia",
        postalCode: "050021",
        phone: "+573001234567",
      },
      items: [
        {
          productId: "1",
          productName: "SaddleBag 12L",
          productSlug: "saddlebag-12l",
          variantColor: "negro",
          variantColorName: "Negro",
          unitPrice: 180000,
          quantity: 1,
          subtotal: 180000,
        },
      ],
    },
    {
      orderNumber: orderNumber(2),
      customerId: customerIds[1],
      customerEmail: "ana.bernal@test.co",
      customerName: "Ana Bernal Torres",
      customerPhone: "+573109876543",
      status: "shipped",
      paymentMethod: "mercadopago",
      paymentReference: "MP-TEST-002",
      mercadopagoId: "1234567891",
      mercadopagoStatus: "approved",
      trackingNumber: "ENVIA-2026-100022",
      carrier: "Envia",
      subtotal: 255000,
      shippingCost: 10000,
      discount: 15000,
      total: 250000,
      shippingAddress: {
        fullName: "Ana Bernal Torres",
        addressLine: "Carrera 15 # 85-32",
        neighborhood: "Chapinero Alto",
        city: "Bogotá",
        department: "Cundinamarca",
        postalCode: "110231",
        phone: "+573109876543",
      },
      items: [
        {
          productId: "1",
          productName: "SaddleBag 12L",
          productSlug: "saddlebag-12l",
          variantColor: "rojo",
          variantColorName: "Rojo",
          unitPrice: 180000,
          quantity: 1,
          subtotal: 180000,
        },
        {
          productId: "2",
          productName: "FrontBag 4L",
          productSlug: "frontbag-4l",
          variantColor: null,
          variantColorName: null,
          unitPrice: 75000,
          quantity: 1,
          subtotal: 75000,
        },
      ],
    },
    {
      orderNumber: orderNumber(3),
      customerId: customerIds[2],
      customerEmail: "juan.ospina@test.co",
      customerName: "Juan Ospina Giraldo",
      customerPhone: "+573156667788",
      status: "processing",
      paymentMethod: "mercadopago",
      paymentReference: "MP-TEST-003",
      mercadopagoId: "1234567892",
      mercadopagoStatus: "approved",
      trackingNumber: null,
      carrier: null,
      subtotal: 360000,
      shippingCost: 14000,
      discount: 0,
      total: 374000,
      shippingAddress: {
        fullName: "Juan Ospina Giraldo",
        addressLine: "Av. Circunvalar # 6-37, Oficina 202",
        neighborhood: "Centro",
        city: "Pereira",
        department: "Risaralda",
        postalCode: "660001",
        phone: "+573156667788",
      },
      items: [
        {
          productId: "1",
          productName: "SaddleBag 12L",
          productSlug: "saddlebag-12l",
          variantColor: "verde",
          variantColorName: "Verde",
          unitPrice: 180000,
          quantity: 2,
          subtotal: 360000,
        },
      ],
    },
    {
      orderNumber: orderNumber(4),
      customerId: customerIds[3],
      customerEmail: "lucia.vargas@test.co",
      customerName: "Lucía Vargas Patiño",
      customerPhone: "+573204445566",
      status: "paid",
      paymentMethod: "mercadopago",
      paymentReference: "MP-TEST-004",
      mercadopagoId: "1234567893",
      mercadopagoStatus: "approved",
      trackingNumber: null,
      carrier: null,
      subtotal: 75000,
      shippingCost: 12000,
      discount: 0,
      total: 87000,
      shippingAddress: {
        fullName: "Lucía Vargas Patiño",
        addressLine: "Calle 5 # 38A-14",
        neighborhood: "Granada",
        city: "Cali",
        department: "Valle del Cauca",
        postalCode: "760001",
        phone: "+573204445566",
      },
      items: [
        {
          productId: "2",
          productName: "FrontBag 4L",
          productSlug: "frontbag-4l",
          variantColor: null,
          variantColorName: null,
          unitPrice: 75000,
          quantity: 1,
          subtotal: 75000,
        },
      ],
    },
    {
      orderNumber: orderNumber(5),
      customerId: null,
      customerEmail: "invitado@test.co",
      customerName: "Comprador Invitado",
      customerPhone: "+573333333333",
      status: "pending",
      paymentMethod: "mercadopago",
      paymentReference: null,
      mercadopagoId: null,
      mercadopagoStatus: "pending",
      trackingNumber: null,
      carrier: null,
      subtotal: 180000,
      shippingCost: 12000,
      discount: 0,
      total: 192000,
      shippingAddress: {
        fullName: "Comprador Invitado",
        addressLine: "Calle 50 # 20-10",
        neighborhood: "Laureles",
        city: "Medellín",
        department: "Antioquia",
        postalCode: "050010",
        phone: "+573333333333",
      },
      items: [
        {
          productId: "1",
          productName: "SaddleBag 12L",
          productSlug: "saddlebag-12l",
          variantColor: "azul",
          variantColorName: "Azul",
          unitPrice: 180000,
          quantity: 1,
          subtotal: 180000,
        },
      ],
    },
  ]

  for (const o of orders) {
    await conn.execute(
      `INSERT INTO app_orders
         (order_number, customer_id, customer_email, customer_name, customer_phone,
          shipping_address, status, payment_method, payment_reference,
          mercadopago_id, mercadopago_status, tracking_number, carrier,
          subtotal, shipping_cost, discount, total, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COP', NOW(), NOW())
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = NOW()`,
      [
        o.orderNumber, o.customerId, o.customerEmail, o.customerName, o.customerPhone,
        JSON.stringify(o.shippingAddress), o.status, o.paymentMethod, o.paymentReference,
        o.mercadopagoId, o.mercadopagoStatus, o.trackingNumber, o.carrier,
        o.subtotal, o.shippingCost, o.discount, o.total,
      ]
    )

    const [[orderRow]] = await conn.execute(
      "SELECT id FROM app_orders WHERE order_number = ?",
      [o.orderNumber]
    )

    for (const item of o.items) {
      await conn.execute(
        `INSERT INTO app_order_items
           (order_id, product_id, product_name, product_slug,
            variant_color, variant_color_name,
            unit_price, quantity, subtotal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderRow.id, item.productId, item.productName, item.productSlug,
          item.variantColor, item.variantColorName,
          item.unitPrice, item.quantity, item.subtotal,
        ]
      )
    }
  }

  console.log(`✅  ${orders.length} pedidos insertados con sus ítems.`)
}

// ─── 6. Suscriptores al newsletter ────────────────────────────────────────────
async function seedNewsletter(conn) {
  console.log("\n📧  Insertando suscriptores de newsletter...")

  const subscribers = [
    { email: "newsletter1@test.co", name: "María López", source: "seed-test" },
    { email: "newsletter2@test.co", name: "Pedro Gómez", source: "seed-test" },
    { email: "newsletter3@test.co", name: "Sandra Ríos", source: "seed-test" },
  ]

  for (const s of subscribers) {
    await conn.execute(
      `INSERT INTO app_newsletter_subscribers (email, name, is_active, source, subscribed_at)
       VALUES (?, ?, 1, ?, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [s.email, s.name, s.source]
    )
  }

  console.log(`✅  ${subscribers.length} suscriptores insertados.`)
}

// ─── 7. Mensajes de contacto ───────────────────────────────────────────────────
async function seedContactMessages(conn) {
  console.log("\n💬  Insertando mensajes de contacto...")

  const messages = [
    {
      name: "Ricardo Salazar",
      email: "rsalazar@test.co",
      phone: "+573178889900",
      subject: "[TEST] ¿Tienen el SaddleBag en color morado?",
      message: "Hola, estoy interesado en el SaddleBag 12L pero quisiera saber si tienen disponible el color morado que vi en Instagram. Gracias.",
      status: "new",
    },
    {
      name: "Sofía Mejía",
      email: "smejia@test.co",
      phone: "+573222334455",
      subject: "[TEST] Consulta sobre envíos a Barranquilla",
      message: "Buenos días, quería confirmar si realizan envíos a Barranquilla y cuánto tiempo demora. Quiero pedir dos SaddleBags para un viaje.",
      status: "read",
    },
    {
      name: "Andrés Castaño",
      email: "acastano@test.co",
      phone: null,
      subject: "[TEST] Pedido CO-2026-00001 — seguimiento",
      message: "Hola, mi pedido CO-2026-00001 dice que ya fue entregado pero no lo he recibido. Por favor ayudarme a verificar la guía.",
      status: "replied",
    },
  ]

  for (const m of messages) {
    await conn.execute(
      `INSERT INTO app_contact_messages
         (name, email, phone, subject, message, status, ip_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '127.0.0.1', NOW(), NOW())`,
      [m.name, m.email, m.phone, m.subject, m.message, m.status]
    )
  }

  console.log(`✅  ${messages.length} mensajes de contacto insertados.`)
}

// ─── 8. Inventario con SKUs ────────────────────────────────────────────────────
// Formato SKU: [Letra producto][3 dígitos ID][3 chars variante] = 7 caracteres exactos
// Letra única por producto: S=SaddleBag, F=FrontBag4L, R=RollTop8L, C=Camiseta,
// H=Herramientas, M=fraMebag, T=TopTube, K=Kit, E=mEnsajero, P=hiPpack,
// B=Botellas, N=phoNemount, G=Gorra
async function seedInventory(conn) {
  console.log("\n📦  Insertando inventario con SKUs...")

  const rows = [
    // ── SaddleBag 12L (id:1, letra S) ──────────────────────────────────────
    { sku: "S001NEG", productId: "1", color: "negro",         colorName: "Negro",          size: null, stock: 15, cost: 90000  },
    { sku: "S001ROJ", productId: "1", color: "rojo",          colorName: "Rojo",           size: null, stock: 10, cost: 90000  },
    { sku: "S001NAR", productId: "1", color: "naranja",       colorName: "Naranja",        size: null, stock: 8,  cost: 90000  },
    { sku: "S001VER", productId: "1", color: "verde",         colorName: "Verde",          size: null, stock: 12, cost: 90000  },
    { sku: "S001AZU", productId: "1", color: "azul",          colorName: "Azul",           size: null, stock: 6,  cost: 90000  },
    // ── FrontBag 4L (id:2, letra F) ─────────────────────────────────────────
    { sku: "F002NEG", productId: "2", color: "negro",         colorName: "Negro",          size: null, stock: 20, cost: 38000  },
    // ── FrontBag Roll Top 8L (id:3, letra R) ────────────────────────────────
    { sku: "R003NEG", productId: "3", color: "negro",         colorName: "Negro",          size: null, stock: 14, cost: 48000  },
    { sku: "R003OLI", productId: "3", color: "verde-oliva",   colorName: "Verde Oliva",    size: null, stock: 7,  cost: 48000  },
    // ── Camiseta Oversize (id:4, letra C) — 3 colores × 4 tallas ────────────
    { sku: "C004NGS", productId: "4", color: "negro",         colorName: "Negro",          size: "S",  stock: 8,  cost: 28000  },
    { sku: "C004NGM", productId: "4", color: "negro",         colorName: "Negro",          size: "M",  stock: 12, cost: 28000  },
    { sku: "C004NGL", productId: "4", color: "negro",         colorName: "Negro",          size: "L",  stock: 10, cost: 28000  },
    { sku: "C004NGX", productId: "4", color: "negro",         colorName: "Negro",          size: "XL", stock: 5,  cost: 28000  },
    { sku: "C004BLS", productId: "4", color: "blanco",        colorName: "Blanco",         size: "S",  stock: 6,  cost: 28000  },
    { sku: "C004BLM", productId: "4", color: "blanco",        colorName: "Blanco",         size: "M",  stock: 9,  cost: 28000  },
    { sku: "C004BLL", productId: "4", color: "blanco",        colorName: "Blanco",         size: "L",  stock: 7,  cost: 28000  },
    { sku: "C004BLX", productId: "4", color: "blanco",        colorName: "Blanco",         size: "XL", stock: 3,  cost: 28000  },
    { sku: "C004GRS", productId: "4", color: "gris",          colorName: "Gris",           size: "S",  stock: 5,  cost: 28000  },
    { sku: "C004GRM", productId: "4", color: "gris",          colorName: "Gris",           size: "M",  stock: 8,  cost: 28000  },
    { sku: "C004GRL", productId: "4", color: "gris",          colorName: "Gris",           size: "L",  stock: 6,  cost: 28000  },
    { sku: "C004GRX", productId: "4", color: "gris",          colorName: "Gris",           size: "XL", stock: 2,  cost: 28000  },
    // ── Porta Herramientas (id:5, letra H) ──────────────────────────────────
    { sku: "H005NEG", productId: "5", color: "negro",         colorName: "Negro",          size: null, stock: 25, cost: 20000  },
    // ── Frame Bag 5L (id:6, letra M — fraMebag) ─────────────────────────────
    { sku: "M006NEG", productId: "6", color: "negro",         colorName: "Negro",          size: null, stock: 18, cost: 58000  },
    // ── Top Tube Bag (id:7, letra T) ─────────────────────────────────────────
    { sku: "T007NEG", productId: "7", color: "negro",         colorName: "Negro",          size: null, stock: 22, cost: 26000  },
    // ── Kit Completo (id:8, letra K) ─────────────────────────────────────────
    { sku: "K008NEG", productId: "8", color: "negro",         colorName: "Negro",          size: null, stock: 5,  cost: 200000 },
    // ── Messenger Bag 15L (id:9, letra E — mEnsajero) ───────────────────────
    { sku: "E009NEG", productId: "9", color: "negro",         colorName: "Negro",          size: null, stock: 10, cost: 65000  },
    { sku: "E009GRC", productId: "9", color: "gris-carbon",   colorName: "Gris Carbon",    size: null, stock: 7,  cost: 65000  },
    // ── Hip Pack 2L (id:10, letra P) ─────────────────────────────────────────
    { sku: "P010NEG", productId: "10", color: "negro",        colorName: "Negro",          size: null, stock: 16, cost: 32000  },
    { sku: "P010NNR", productId: "10", color: "negro-naranja",colorName: "Negro/Naranja",  size: null, stock: 9,  cost: 32000  },
    // ── Porta Botellas Stem (id:11, letra B) ─────────────────────────────────
    { sku: "B011NEG", productId: "11", color: "negro",        colorName: "Negro",          size: null, stock: 30, cost: 18000  },
    // ── Phone Mount (id:12, letra N — phoNe) ─────────────────────────────────
    { sku: "N012NEG", productId: "12", color: "negro",        colorName: "Negro",          size: null, stock: 20, cost: 24000  },
    // ── Cycling Cap (id:13, letra G — Gorra) ─────────────────────────────────
    { sku: "G013NEG", productId: "13", color: "negro",        colorName: "Negro",          size: null, stock: 18, cost: 15000  },
    { sku: "G013NNR", productId: "13", color: "negro-naranja",colorName: "Negro/Naranja",  size: null, stock: 11, cost: 15000  },
  ]

  for (const r of rows) {
    await conn.execute(
      `INSERT INTO app_inventory
         (sku, product_id, variant_color, variant_color_name, variant_size,
          stock_quantity, low_stock_threshold, is_available, cost_price, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 3, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         stock_quantity     = VALUES(stock_quantity),
         variant_color_name = VALUES(variant_color_name),
         cost_price         = VALUES(cost_price),
         updated_at         = NOW()`,
      [r.sku, r.productId, r.color, r.colorName, r.size, r.stock, r.cost]
    )
  }

  console.log(`✅  ${rows.length} SKUs de inventario insertados.`)
  console.log("    Letras asignadas: S F R C H M T K E P B N G (única por producto)")
}

// ─── 9. Cupones de descuento ───────────────────────────────────────────────────
async function seedCoupons(conn) {
  console.log("\n🏷️   Insertando cupones de descuento...")

  const coupons = [
    {
      code: "BIKE20",
      description: "20% de descuento en toda la tienda — lanzamiento",
      discountType: "percentage",
      discountValue: 20,
      minOrderAmount: 50000,
      maxDiscountAmount: 60000,
      maxUses: 100,
      maxUsesPerCustomer: 1,
      appliesTo: "all",
      appliesToValue: null,
      validFrom: "2026-01-01 00:00:00",
      validUntil: "2026-12-31 23:59:59",
      isActive: 1,
    },
    {
      code: "VERANO15",
      description: "15% descuento en alforjas — temporada verano",
      discountType: "percentage",
      discountValue: 15,
      minOrderAmount: 80000,
      maxDiscountAmount: 40000,
      maxUses: 50,
      maxUsesPerCustomer: 1,
      appliesTo: "category",
      appliesToValue: "alforjas",
      validFrom: "2026-06-01 00:00:00",
      validUntil: "2026-08-31 23:59:59",
      isActive: 1,
    },
    {
      code: "FIRSTRIDE",
      description: "$15.000 de descuento para primera compra",
      discountType: "fixed",
      discountValue: 15000,
      minOrderAmount: 60000,
      maxDiscountAmount: null,
      maxUses: null,
      maxUsesPerCustomer: 1,
      appliesTo: "all",
      appliesToValue: null,
      validFrom: "2026-01-01 00:00:00",
      validUntil: null,
      isActive: 1,
    },
    {
      code: "KITDEAL",
      description: "$50.000 descuento en el Kit Completo Bikepacking",
      discountType: "fixed",
      discountValue: 50000,
      minOrderAmount: 400000,
      maxDiscountAmount: null,
      maxUses: 30,
      maxUsesPerCustomer: 1,
      appliesTo: "product",
      appliesToValue: "kit-completo-bikepacking",
      validFrom: "2026-01-01 00:00:00",
      validUntil: "2026-06-30 23:59:59",
      isActive: 1,
    },
  ]

  for (const c of coupons) {
    await conn.execute(
      `INSERT INTO app_coupons
         (code, description, discount_type, discount_value, min_order_amount,
          max_discount_amount, max_uses, uses_count, max_uses_per_customer,
          applies_to, applies_to_value, valid_from, valid_until, is_active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         discount_value = VALUES(discount_value),
         is_active      = VALUES(is_active),
         updated_at     = NOW()`,
      [
        c.code, c.description, c.discountType, c.discountValue,
        c.minOrderAmount, c.maxDiscountAmount, c.maxUses, c.maxUsesPerCustomer,
        c.appliesTo, c.appliesToValue, c.validFrom, c.validUntil, c.isActive,
      ]
    )
  }

  console.log(`✅  ${coupons.length} cupones insertados.`)
}

// ─── 10. Historial de estados de pedidos ───────────────────────────────────────
async function seedOrderStatusHistory(conn) {
  console.log("\n📋  Insertando historial de estados de pedidos...")

  // Obtener los IDs de los pedidos de prueba
  const [orderRows] = await conn.execute(
    "SELECT id, order_number, status FROM app_orders WHERE order_number LIKE 'CO-2026-%' ORDER BY order_number"
  )

  if (orderRows.length === 0) {
    console.log("⚠️   No hay pedidos de prueba. Ejecuta seedOrders primero.")
    return
  }

  const historyMap = {
    "CO-2026-00001": [
      { from: null,           to: "pending",    by: "system",       note: "Pedido creado desde el sitio web" },
      { from: "pending",      to: "paid",       by: "mercadopago",  note: "Pago aprobado — MercadoPago ID: 1234567890" },
      { from: "paid",         to: "processing", by: "admin",        note: "Pedido en preparación, revisión de stock" },
      { from: "processing",   to: "shipped",    by: "admin",        note: "Enviado con Servientrega, guía: SRV-2026-000001" },
      { from: "shipped",      to: "delivered",  by: "system",       note: "Entrega confirmada por Servientrega" },
    ],
    "CO-2026-00002": [
      { from: null,           to: "pending",    by: "system",       note: "Pedido creado desde el sitio web" },
      { from: "pending",      to: "paid",       by: "mercadopago",  note: "Pago aprobado — MercadoPago ID: 1234567891" },
      { from: "paid",         to: "processing", by: "admin",        note: "En alistamiento" },
      { from: "processing",   to: "shipped",    by: "admin",        note: "Enviado con Envia, guía: ENVIA-2026-100022" },
    ],
    "CO-2026-00003": [
      { from: null,           to: "pending",    by: "system",       note: "Pedido creado desde el sitio web" },
      { from: "pending",      to: "paid",       by: "mercadopago",  note: "Pago aprobado — MercadoPago ID: 1234567892" },
      { from: "paid",         to: "processing", by: "admin",        note: "Preparando 2 unidades SaddleBag Verde" },
    ],
    "CO-2026-00004": [
      { from: null,           to: "pending",    by: "system",       note: "Pedido creado desde el sitio web" },
      { from: "pending",      to: "paid",       by: "mercadopago",  note: "Pago aprobado — MercadoPago ID: 1234567893" },
    ],
    "CO-2026-00005": [
      { from: null,           to: "pending",    by: "system",       note: "Pedido creado desde el sitio web, pago pendiente" },
    ],
  }

  let totalRows = 0
  for (const order of orderRows) {
    const history = historyMap[order.order_number]
    if (!history) continue

    for (const h of history) {
      await conn.execute(
        `INSERT INTO app_order_status_history
           (order_id, order_number, from_status, to_status, changed_by, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [order.id, order.order_number, h.from, h.to, "seed-test", h.note]
      )
      totalRows++
    }
  }

  console.log(`✅  ${totalRows} registros de historial insertados para ${orderRows.length} pedidos.`)
}

// ─── Verificación: contar filas por tabla ──────────────────────────────────────
async function printTableCounts(conn) {
  const tables = [
    "app_products",
    "app_media_assets",
    "app_inventory",
    "app_coupons",
    "app_customers",
    "app_addresses",
    "app_orders",
    "app_order_items",
    "app_order_status_history",
    "app_newsletter_subscribers",
    "app_contact_messages",
  ]

  console.log("\n📊  Estado actual de las tablas:")
  console.log("    ─────────────────────────────────────────")
  for (const table of tables) {
    const [[row]] = await conn.execute(`SELECT COUNT(*) AS total FROM \`${table}\``)
    console.log(`    ${table.padEnd(32)} ${String(row.total).padStart(4)} filas`)
  }
  console.log("    ─────────────────────────────────────────")
}

// ─── Punto de entrada ──────────────────────────────────────────────────────────
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("  CERO.UNO — Datos de prueba")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  const conn = await getConnection()

  try {
    if (clean) await cleanTestData(conn)

    await seedProducts(conn)
    await seedMediaAssets(conn)
    await seedInventory(conn)
    await seedCoupons(conn)
    const customerIds = await seedCustomers(conn)
    await seedAddresses(conn, customerIds)
    await seedOrders(conn, customerIds)
    await seedOrderStatusHistory(conn)
    await seedNewsletter(conn)
    await seedContactMessages(conn)

    await printTableCounts(conn)

    console.log("\n✅  Datos de prueba cargados correctamente.")
    console.log("    Puedes revisar las tablas desde el panel de tu hosting")
    console.log("    o con: mysql -u usuario -p nombre_db\n")
    console.log("    SKUs generados — formato [Letra][ID×3][Variante×3]:")
    console.log("    S=SaddleBag  F=FrontBag4L  R=RollTop8L  C=Camiseta")
    console.log("    H=Herramientas  M=FrameBag  T=TopTube  K=Kit")
    console.log("    E=Mensajero  P=HipPack  B=Botellas  N=PhoneMount  G=Gorra\n")
    console.log("    Para limpiar los datos de prueba:")
    console.log("    node scripts/seed-test-data.js --clean\n")
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("\n❌  Error durante el seed:", err.message)
  if (err.code === "ECONNREFUSED") {
    console.error("    No se pudo conectar a la base de datos.")
    console.error("    Verifica que DATABASE_URL sea correcta y que MariaDB esté corriendo.")
  }
  process.exit(1)
})
