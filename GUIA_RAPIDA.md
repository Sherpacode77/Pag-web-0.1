# 🎯 GUÍA RÁPIDA - Panel de Administración

## ✅ Sistema Instalado Correctamente

Ya tienes el sistema de gestión de productos funcionando con **13 productos** cargados.

---

## 🚀 Acceso Rápido

### 1️⃣ Inicia el servidor (si no está corriendo)
```bash
npm run dev
```

### 2️⃣ Abre el panel de administración
```
http://localhost:3000/admin
```

### 3️⃣ Inicia sesión
- **Usuario:** `admin`
- **Contraseña:** `cerouno2026`

---

## 🛠️ Funciones Disponibles

### ➕ AGREGAR PRODUCTO
1. Click en "Nuevo Producto"
2. Completa el formulario
3. Click en "Guardar"

### ✏️ EDITAR PRODUCTO
1. En la tabla, click en el ícono del lápiz ✏️
2. Modifica los campos que necesites
3. Click en "Guardar"

### 🗑️ ELIMINAR PRODUCTO
1. Click en el ícono de basura 🗑️
2. Confirma la eliminación

### 🔍 BUSCAR Y FILTRAR
- Usa la barra de búsqueda para encontrar productos
- Filtra por categoría en el dropdown

---

## 📁 Subir Imágenes

### Paso 1: Coloca tu imagen
```
public/images/products/nombre-de-producto.jpg
```

### Paso 2: En el formulario usa
```
/images/products/nombre-de-producto.jpg
```

**Tip:** Usa nombres descriptivos y sin espacios (usa guiones)

---

## 💡 Campos Importantes

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre del producto | `SaddleBag 12L` |
| **Slug** | URL amigable (sin espacios) | `saddlebag-12l` |
| **Precio** | Solo números, sin puntos | `180000` |
| **Categoría** | alforjas, accesorios, ropa, kits | `alforjas` |
| **Destacado** | ✅ Aparece en página principal | Checkbox |
| **Más vendido** | ✅ Badge especial | Checkbox |

---

## 🔄 Los cambios se reflejan instantáneamente

- ✅ Página principal
- ✅ Tienda
- ✅ Categorías (Alforjas, Accesorios)
- ✅ Búsqueda
- ✅ Filtros

---

## ⚠️ Importante

### Backup
El archivo `lib/products.json` contiene todos tus productos.  
**Haz backup regularmente** copiándolo a un lugar seguro.

### Seguridad
Para cambiar la contraseña, crea `.env.local`:
```env
ADMIN_USERNAME=tu_usuario
ADMIN_PASSWORD=tu_contraseña_segura
```

---

## 🆘 Solución de Problemas

### No veo mis cambios
1. Recarga la página (F5 o Ctrl+R)
2. Verifica que guardaste correctamente
3. Mira la consola del navegador (F12)

### Error al guardar
1. Verifica que todos los campos requeridos (*) estén completos
2. El precio debe ser solo números
3. El slug no debe tener espacios

### Olvidé mi contraseña
1. Edita `app/api/auth/login/route.ts`
2. Cambia las credenciales por defecto
3. Reinicia el servidor

---

## 📞 Soporte

Revisa el archivo completo: `ADMIN_README.md` para más detalles.

---

**¡Todo listo! 🎉**  
Tu panel de administración está funcionando perfectamente.
