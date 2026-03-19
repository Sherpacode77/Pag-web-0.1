# 🛠️ Panel de Administración - CERO.UNO

Sistema de gestión de productos para el e-commerce de CERO.UNO.

## 🚀 Inicio Rápido

### 1. Inicializar productos

Primero, ejecuta el script de inicialización para copiar los productos existentes al sistema de gestión:

```bash
npx tsx scripts/init-products.ts
```

Esto creará el archivo `lib/products.json` con todos tus productos actuales.

### 2. Acceder al panel de administración

Ve a: **http://localhost:3000/admin**

**Credenciales por defecto (solo desarrollo):**
- Usuario: `admin`
- Contraseña: `cerouno2026`

**Producción (obligatorio):** configura variables de entorno en el hosting:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (mínimo 32 caracteres)

La autenticación de admin ahora usa cookie de sesión `httpOnly` firmada en servidor (no se guarda token en `localStorage`).

### 3. Gestionar productos

Una vez dentro del dashboard, puedes:
- ✅ Ver todos los productos
- ➕ Agregar nuevos productos
- ✏️ Editar productos existentes
- 🗑️ Eliminar productos
- 💰 Cambiar precios
- 🏷️ Marcar como destacado o más vendido
- 🔍 Buscar y filtrar productos

## 📂 Estructura de archivos

```
app/
  admin/
    page.tsx              # Página de login
    dashboard/
      page.tsx            # Panel de administración
  api/
    auth/
      login/
        route.ts          # API de autenticación
    products/
      route.ts            # API CRUD de productos

lib/
  products.json           # Base de datos de productos (se genera)
  
hooks/
  use-products.tsx        # Hook para obtener productos

scripts/
  init-products.ts        # Script de inicialización
```

## 🔐 Seguridad

### Cambiar credenciales (importante para producción)

Crea un archivo `.env.local` en la raíz del proyecto:

```env
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_contraseña_segura
```

**⚠️ IMPORTANTE:** En producción deberías:
1. Usar variables de entorno
2. Hashear las contraseñas (bcrypt)
3. Implementar JWT o sesiones seguras
4. Agregar rate limiting
5. Implementar autenticación de dos factores

## 📝 Agregar un nuevo producto

1. Ve al dashboard
2. Click en "Nuevo Producto"
3. Completa el formulario:
   - **Nombre**: Nombre del producto
   - **Slug**: URL amigable (ej: `saddlebag-12l`)
   - **Precio**: Precio en COP (sin puntos ni comas)
   - **Precio Original**: (Opcional) Para mostrar descuentos
   - **Categoría**: alforjas, accesorios, ropa, kits
   - **Descripción corta**: Para listados
   - **Descripción completa**: Detalle del producto
   - **Imagen**: Ruta de la imagen (ej: `/images/products/producto.jpg`)
   - **Tags**: Palabras clave separadas por coma
   - **Destacado**: Aparecerá en página principal
   - **Más vendido**: Badge especial

4. Click en "Guardar"

## 🖼️ Subir imágenes

1. Coloca las imágenes en: `public/images/products/`
2. En el formulario, usa la ruta relativa: `/images/products/nombre-imagen.jpg`

## 🔄 Cómo funciona

El sistema usa:
- **API Routes** de Next.js para CRUD
- **Archivo JSON** para persistir datos (simple, sin base de datos)
- **Context API** de React para estado global del carrito
- **LocalStorage** para sesión de admin

### Flujo de datos:

```
Usuario → Frontend → API Route → products.json
                                    ↓
                               productos actualizados
                                    ↓
                           todas las páginas se refrescan
```

## 📊 Características del dashboard

- **Estadísticas**: Total de productos, destacados, más vendidos
- **Búsqueda**: Busca por nombre o descripción
- **Filtros**: Por categoría
- **Vista de tabla**: Lista completa con imagen, precio, estado
- **Edición rápida**: Click en ícono de lápiz
- **Eliminación**: Con confirmación

## 🐛 Solución de problemas

### Los productos no aparecen

1. Verifica que hayas ejecutado: `npx tsx scripts/init-products.ts`
2. Verifica que existe `lib/products.json`
3. Recarga la página (Ctrl + R)

### No puedo iniciar sesión

1. Verifica las credenciales por defecto: `admin` / `cerouno2026`
2. Si cambiaste las variables de entorno, reinicia el servidor
3. Limpia localStorage: `localStorage.clear()` en consola del navegador

### Los cambios no se reflejan

1. Verifica que el archivo `lib/products.json` se esté actualizando
2. Recarga la página que estás viendo
3. Verifica la consola del navegador por errores

## 🔮 Mejoras futuras recomendadas

Para un sistema más robusto, considera:

1. **Base de datos real**: PostgreSQL, MongoDB, Supabase
2. **Almacenamiento de imágenes**: Cloudinary, AWS S3
3. **Autenticación robusta**: NextAuth.js, Clerk
4. **Validación**: Zod para validar formularios
5. **Upload de imágenes**: Drag & drop directo en el dashboard
6. **Historial de cambios**: Log de modificaciones
7. **Múltiples administradores**: Roles y permisos
8. **Backup automático**: De products.json

## 📖 API Endpoints

### GET `/api/products`
Obtiene todos los productos

### POST `/api/products`
Crea un nuevo producto
```json
{
  "name": "Producto",
  "slug": "producto",
  "price": 100000,
  "category": "alforjas",
  ...
}
```

### PUT `/api/products`
Actualiza un producto existente
```json
{
  "id": "1",
  "name": "Producto Actualizado",
  ...
}
```

### DELETE `/api/products?id=1`
Elimina un producto por ID

## 🤝 Soporte

Si tienes problemas o preguntas, revisa:
1. Consola del navegador (F12)
2. Terminal donde corre el servidor
3. Archivo `lib/products.json`

---

**¡Listo!** Ya puedes gestionar tus productos sin tocar el código 🎉
