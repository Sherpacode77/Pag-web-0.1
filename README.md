# 🛍️ CERO.UNO - E-Commerce Platform

Sistema de e-commerce completo para la venta de productos de ciclismo y viaje, con panel de administración integrado.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.17-38bdf8?style=flat-square&logo=tailwindcss)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Demo](#-demo)
- [Tecnologías](#️-tecnologías)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Panel de Administración](#-panel-de-administración)
- [API Routes](#-api-routes)
- [Despliegue](#-despliegue)
- [Documentación Adicional](#-documentación-adicional)

---

## ✨ Características

### 🎨 Frontend (Cliente)
- ✅ Diseño moderno y responsivo con TailwindCSS
- ✅ Modo oscuro/claro con next-themes
- ✅ Hero section con llamadas a la acción
- ✅ Catálogo de productos con filtros y búsqueda
- ✅ Páginas de detalle de producto con galería de imágenes
- ✅ Carrito de compras con persistencia
- ✅ Sistema de variantes (talla, color)
- ✅ Sección de blog con artículos
- ✅ Página de contacto
- ✅ Integración con WhatsApp
- ✅ Newsletter
- ✅ Animaciones y transiciones suaves

### 🛠️ Panel de Administración
- ✅ Sistema de autenticación
- ✅ Dashboard completo de gestión
- ✅ CRUD de productos (Crear, Leer, Actualizar, Eliminar)
- ✅ Gestión de variantes de productos
- ✅ Upload de imágenes (drag & drop)
- ✅ Galería de imágenes con búsqueda
- ✅ Upload de videos
- ✅ Sistema de múltiples imágenes por producto
- ✅ Búsqueda y filtrado en tiempo real
- ✅ Estadísticas y métricas
- ✅ Marcar productos como destacados o más vendidos

### 📁 Sistema de Archivos
- ✅ Upload de imágenes local (sin servicios externos)
- ✅ Validación de archivos (tipo y tamaño)
- ✅ Preview instantáneo
- ✅ Nombres únicos automáticos
- ✅ Funciona en desarrollo y producción

---

## 🎯 Demo

### URLs Principales
- **Home:** `http://localhost:3000`
- **Tienda:** `http://localhost:3000/tienda`
- **Admin Dashboard:** `http://localhost:3000/admin/dashboard`
- **Login Admin:** `http://localhost:3000/admin`

### Credenciales de Administrador
```
Usuario: admin
Contraseña: cerouno2026
```

> En producción debes configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` en variables de entorno.

---

## 🛠️ Tecnologías

### Core
- **[Next.js 16.1.6](https://nextjs.org/)** - Framework React con App Router
- **[React 19.2.3](https://react.dev/)** - Biblioteca de UI
- **[TypeScript 5.7.3](https://www.typescriptlang.org/)** - Tipado estático
- **[TailwindCSS 3.4.17](https://tailwindcss.com/)** - Framework CSS utility-first

### UI Components
- **[Radix UI](https://www.radix-ui.com/)** - Componentes primitivos accesibles
- **[shadcn/ui](https://ui.shadcn.com/)** - Colección de componentes
- **[Lucide React](https://lucide.dev/)** - Iconos
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Gestión de temas

### Forms & Validation
- **[React Hook Form](https://react-hook-form.com/)** - Gestión de formularios
- **[Zod](https://zod.dev/)** - Validación de esquemas

### Carousels & Media
- **[Embla Carousel](https://www.embla-carousel.com/)** - Carruseles
- **[Recharts](https://recharts.org/)** - Gráficos y visualizaciones

### Utilities
- **[clsx](https://github.com/lukeed/clsx)** - Utilidad para classNames
- **[date-fns](https://date-fns.org/)** - Manipulación de fechas
- **[Sonner](https://sonner.emilkowal.ski/)** - Notificaciones toast

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 18.x o superior
- pnpm (recomendado) o npm
- Git

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/v0-drive-content-retrieval.git
cd v0-drive-content-retrieval
```

2. **Instalar dependencias**
```bash
pnpm install
# o
npm install
```

3. **Inicializar productos** (primera vez)
```bash
npx tsx scripts/init-products.ts
```

4. **Iniciar el servidor de desarrollo**
```bash
pnpm dev
# o
npm run dev
```

5. **Abrir en el navegador**
```
http://localhost:3000
```

---

## 📖 Uso

### Para Usuarios (Clientes)

1. **Explorar productos:** Navega por la tienda en `/tienda`
2. **Ver detalles:** Click en cualquier producto para ver más información
3. **Agregar al carrito:** Selecciona variantes y cantidad
4. **Ver carrito:** Click en el icono del carrito en la navbar
5. **Contactar:** Usa el botón de WhatsApp o la página de contacto

### Para Administradores

1. **Acceder al panel:**
   - Ve a `http://localhost:3000/admin`
   - Ingresa las credenciales

2. **Gestionar productos:**
   - **Nuevo:** Click en "Nuevo Producto"
   - **Editar:** Click en el ícono ✏️ en la tabla
   - **Eliminar:** Click en el ícono 🗑️

3. **Subir imágenes:**
   - **Drag & drop** en la zona de upload, o
   - **Click** para seleccionar archivo
   - O seleccionar de la galería existente

4. **Gestionar variantes:**
   - Agregar tallas y colores
   - Asignar stock por variante

---

## 📂 Estructura del Proyecto

```
v0-drive-content-retrieval/
├── app/                          # App Router de Next.js
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Página de inicio
│   ├── globals.css              # Estilos globales
│   ├── admin/                   # Panel de administración
│   │   ├── page.tsx            # Login admin
│   │   └── dashboard/
│   │       └── page.tsx        # Dashboard principal
│   ├── api/                     # API Routes
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── route.ts    # API autenticación
│   │   ├── products/
│   │   │   └── route.ts        # API CRUD productos
│   │   └── upload/
│   │       ├── image/          # Upload imágenes
│   │       └── video/          # Upload videos
│   ├── tienda/                  # Catálogo de productos
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx        # Detalle de producto
│   ├── blog/                    # Blog
│   ├── contacto/                # Página de contacto
│   └── nosotros/                # Página about
│
├── components/                   # Componentes React
│   ├── ui/                      # Componentes UI (shadcn)
│   ├── navbar.tsx               # Navegación
│   ├── footer.tsx               # Footer
│   ├── hero-section.tsx         # Hero
│   ├── product-card.tsx         # Tarjeta de producto
│   ├── cart-sidebar.tsx         # Carrito lateral
│   ├── image-upload.tsx         # Upload de imagen
│   ├── multi-image-upload.tsx   # Upload múltiple
│   ├── video-upload.tsx         # Upload de video
│   ├── variant-manager.tsx      # Gestión de variantes
│   └── ...                      # Otros componentes
│
├── lib/                         # Utilidades y datos
│   ├── utils.ts                # Funciones utilidad
│   ├── data.ts                 # Datos estáticos
│   ├── products.json           # Productos (generado)
│   └── cart-context.tsx        # Contexto del carrito
│
├── hooks/                       # Custom hooks
│   ├── use-products.tsx        # Hook de productos
│   └── use-toast.ts            # Hook de toasts
│
├── public/                      # Archivos estáticos
│   ├── images/
│   │   ├── products/           # Imágenes de productos
│   │   └── blog/               # Imágenes de blog
│   └── videos/
│       └── products/           # Videos de productos
│
├── scripts/                     # Scripts de utilidad
│   └── init-products.ts        # Inicializar productos
│
├── styles/                      # Estilos adicionales
├── package.json                 # Dependencias
├── tsconfig.json               # Config TypeScript
├── tailwind.config.ts          # Config Tailwind
├── next.config.mjs             # Config Next.js
└── README.md                   # Este archivo
```

---

## 🔐 Panel de Administración

### Acceso
```
URL: http://localhost:3000/admin
Usuario: admin
Contraseña: cerouno2026
```

### Funcionalidades

#### 📦 Gestión de Productos
- **Crear:** Formulario completo con validación
- **Editar:** Modificar cualquier campo del producto
- **Eliminar:** Con confirmación
- **Búsqueda:** Filtrar por nombre o categoría
- **Campos disponibles:**
  - Nombre y slug
  - Descripción corta y detallada
  - Precio y precio sin descuento
  - Categoría
  - Tags
  - Stock
  - Destacado / Más vendido
  - Imágenes (principal y galería)
  - Video
  - Variantes (talla, color, stock)

#### 🖼️ Sistema de Imágenes
- **Upload nuevo:** Drag & drop o click para seleccionar
- **Galería:** Ver y seleccionar imágenes existentes
- **Validación:** Tipo (jpg, png, webp) y tamaño (máx. 5MB)
- **Preview:** Inmediato tras el upload
- **Multi-imagen:** Hasta 5 imágenes por producto

#### 🎬 Sistema de Videos
- Upload de videos para productos
- Preview del video cargado
- Validación de tipo y tamaño

#### 📊 Dashboard
- Estadísticas de productos
- Productos recientes
- Acciones rápidas

---

## 🔌 API Routes

### Autenticación

#### `POST /api/auth/login`
Login de administrador.

**Request:**
```json
{
  "username": "admin",
  "password": "cerouno2026"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login exitoso"
}
```

### Productos

#### `GET /api/products`
Obtener todos los productos.

**Response:**
```json
[
  {
    "id": "1",
    "name": "Producto 1",
    "slug": "producto-1",
    "price": 100,
    "category": "alforjas",
    "image": "/images/products/producto-1.jpg",
    ...
  }
]
```

#### `POST /api/products`
Crear un nuevo producto.

**Request:**
```json
{
  "name": "Nuevo Producto",
  "price": 150,
  "category": "accesorios",
  ...
}
```

#### `PUT /api/products`
Actualizar un producto existente.

**Request:**
```json
{
  "id": "1",
  "name": "Producto Actualizado",
  ...
}
```

#### `DELETE /api/products`  
Eliminar un producto.

**Request:**
```json
{
  "id": "1"
}
```

### Upload

#### `POST /api/upload/image`
Subir una imagen.

**Content-Type:** `multipart/form-data`

**Response:**
```json
{
  "url": "/images/products/1739283746-imagen.jpg"
}
```

#### `POST /api/upload/video`
Subir un video.

**Content-Type:** `multipart/form-data`

---

## 🌐 Despliegue

### Vercel (Recomendado)

1. **Conectar con GitHub:**
   - Ve a [vercel.com](https://vercel.com)
   - Importa tu repositorio

2. **Configuración automática:**
   - Vercel detecta Next.js automáticamente
   - No necesitas configurar nada adicional

3. **Deploy:**
   - Vercel hace deploy automático en cada push a main

### Otras Plataformas

El proyecto es compatible con cualquier plataforma que soporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

### Build Manual

```bash
pnpm build
pnpm start
```

---

## 📚 Documentación Adicional

Este repositorio incluye documentación especializada:

- **[GUIA_RAPIDA.md](GUIA_RAPIDA.md)** - Guía rápida del panel de administración
- **[ADMIN_README.md](ADMIN_README.md)** - Documentación detallada del admin
- **[SISTEMA_IMAGENES.md](SISTEMA_IMAGENES.md)** - Sistema de gestión de imágenes

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Scripts Disponibles

```bash
# Desarrollo con Turbo
pnpm dev

# Build para producción
pnpm build

# Iniciar en producción
pnpm start

# Linting
pnpm lint

# Inicializar productos
pnpm init-products
```

---

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Limpia cache y reinstala
rm -rf .next node_modules
pnpm install
pnpm dev
```

### Las imágenes no se muestran
- Verifica que estén en `public/images/products/`
- Comprueba que la ruta en products.json sea correcta
- Reinicia el servidor

### Error en products.json
```bash
# Reinicializa los productos
npx tsx scripts/init-products.ts
```

---

## 📄 Licencia

Este proyecto es privado y propiedad de CERO.UNO.

---

## 👥 Equipo

Desarrollado con ❤️ para CERO.UNO

---

## 📞 Contacto

Para soporte o consultas:
- **Email:** contacto@cero.uno
- **WhatsApp:** [Link en la web]
- **Website:** https://cero.uno

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**
