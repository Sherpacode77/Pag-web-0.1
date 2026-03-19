# ✅ CERO.UNO - Hostinger Deployment Requirements Checklist

## 📋 Requisitos Mínimos Hostinger

### 1. ✅ Plan Compatible
- **Requerido:** Hosting Business o Cloud
- **Estado:** CERO.UNO requiere Hostinger Cloud (VPS con Docker)
- **Razón:** Next.js 16 + Node.js 24 requieren más recursos que Hosting compartido

### 2. ✅ Package.json en la Raíz
```json
{
  "name": "cero-uno-ecommerce",
  "version": "1.0.0",
  "description": "CERO.UNO - E-commerce de bicicletas y accesorios",
  "private": true,
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "init-products": "node -e \"require('fs').writeFileSync('lib/products.json', JSON.stringify(require('./lib/data.ts').products || [], null, 2))\""
  },
  ...
}
```
- **Status:** ✅ Presente en raíz
- **Verificar:** `cat package.json | grep -E '"name"|"version"|"engines"'`

### 3. ✅ Scripts de Inicio para Producción
```json
"scripts": {
  "dev": "next dev --turbo",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "init-products": "..."
}
```
- **Status:** ✅ `"start": "next start"` presente
- **Qué hace:** Inicia Next.js en modo producción (Port 3000 por defecto)
- **Verificar:** `npm run build && npm start` debe funcionar localmente

### 4. ✅ Script Build Incluido
```json
"build": "next build"
```
- **Status:** ✅ Build script presente
- **Genera:** `.next/` (carpeta de build optimizada)
- **Tamaño típico:** ~200MB (incluye optimizaciones)
- **Verificar localmente:** `npm run build`

### 5. ✅ Versión de Node Especificada
```json
"engines": {
  "node": ">=18.0.0",
  "pnpm": ">=10.0.0"
}
```
- **Status:** ✅ Especificada (soporta 18+, 20, 22, 24)
- **Recomendado en Hostinger:** 24.x (último LTS)
- **Verificar en servidor:** `node --version`

### 6. ✅ node_modules NO en Git
**Status:** ✅ Excluido en `.gitignore`
```ignore
node_modules/
.pnp
.pnp.js
```
- **Verificar:** `git status | grep node_modules` (no debe aparecer)
- **Instalación automática:** Hostinger ejecuta `npm install` / `pnpm install` en deploy

### 7. ✅ Archivo .env.production Necesario
**Status:** ⏳ Template creado, valores a definir en panel Hostinger

**Requeridas:**
```bash
# Producción - Variables de Entorno CERO.UNO
NODE_ENV=production

# Admin Credentials
ADMIN_USERNAME=tu_usuario_seguro
ADMIN_PASSWORD=tu_contraseña_muy_segura_min_20_caracteres
ADMIN_SESSION_SECRET=generado_con_openssl_rand_base64_32_minimo

# Opcional en el futuro:
# MERCADO_PAGO_ACCESS_TOKEN=prod_xxxxx
# NEXT_PUBLIC_GTM_ID=GTM-XXXXX
# NEXT_PUBLIC_GA4_ID=G-XXXXX
```

---

## 🚀 Pasos de Deployment en Hostinger

### Opción A: Deployment Manual (Node.js Directo)

#### Paso 1: SSH al Servidor
```powershell
ssh -i "$HOME\.ssh\id_ed25519" root@TU_VPS_IP
```

#### Paso 2: Clonar Repo
```bash
cd /home
git clone https://github.com/Jdlopezva/v0-drive-content-retrieval.git cero-uno
cd cero-uno
```

#### Paso 3: Instalar Dependencias
```bash
# Usar pnpm (más rápido que npm)
npm install -g pnpm
pnpm install --frozen-lockfile
```

#### Paso 4: Configurar Variables
```bash
cat > .env.production << 'EOF'
NODE_ENV=production
ADMIN_USERNAME=admin_cero_uno
ADMIN_PASSWORD=TuContraseña_SuperSegura_20+caracteres
ADMIN_SESSION_SECRET=$(openssl rand -base64 32)
EOF

chmod 600 .env.production
```

#### Paso 5: Build
```bash
pnpm build
```

**Esperado:**
```
> next build
✓ Compiled successfully
✓ Created optimized production build
```

#### Paso 6: Iniciar con PM2 (para mantenerlo corriendo)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar app
pm2 start "pnpm start" --name "cero-uno" --env production

# Verificar
pm2 list
pm2 logs cero-uno

# Enable auto-restart en reboots
pm2 startup
pm2 save
```

#### Paso 7: Nginx Reverse Proxy
```bash
# Ver DEPLOYMENT_HOSTINGER.md paso 6 para configuración Nginx
# URL: https://cero-uno-bikes.com → localhost:3000
```

---

### Opción B: Deployment con Docker (Recomendado ⭐)

```bash
ssh -i "$HOME\.ssh\id_ed25519" root@TU_VPS_IP < ./scripts/init-deployment.sh
```

**Ventajas:**
- ✅ Reproducible en cualquier máquina
- ✅ Aislado de dependencias del sistema
- ✅ Fácil rollback
- ✅ Multi-versión de Node sin conflictos
- ✅ Volumes persistentes para datos

**Ver:** [DEPLOYMENT_HOSTINGER.md](DEPLOYMENT_HOSTINGER.md)

---

## 🔒 Variables de Entorno - Checklist

### En Hostinger Panel - Agregar Variables

1. **NODE_ENV**
   - Valor: `production`
   - Crítico: ✅ SÍ

2. **ADMIN_USERNAME**
   - Valor: Tu usuario admin (no "admin" default)
   - Crítico: ✅ SÍ
   - Ejemplo: `gerente_tienda_cero`

3. **ADMIN_PASSWORD**
   - Valor: Contraseña muy segura (mín. 20 caracteres)
   - Crítico: ✅ SÍ
   - Mix: Mayúsculas + minúsculas + números + símbolos
   - Ejemplo: `C3r0-UNO@2026!xyz#` (mínimo)

4. **ADMIN_SESSION_SECRET**
   - Valor: Generar con `openssl rand -base64 32`
   - Crítico: ✅ SÍ
   - Mínimo: 32 caracteres
   - Guardado: SOLO en Hostinger panel (.env.production no commiteado)

5. **NEXT_PUBLIC_API_URL** (Opcional)
   - Valor: `https://cero-uno.com`
   - Uso: Para links absolutos en emails/SSR
   - Crítico: ❌ NO

---

## 🧪 Verificación Post-Deployment

### Test 1: Servidor Corriendo
```bash
curl -i http://localhost:3000
# Esperado: HTTP 200 OK
```

### Test 2: Admin Panel Accesible
```bash
curl -i https://tu-dominio.com/admin
# Esperado: HTTP 200 (página login)
```

### Test 3: Login Funciona
```bash
curl -X POST https://tu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tu_usuario","password":"tu_password"}'
# Esperado: 200 + Set-Cookie header
```

### Test 4: API Productos
```bash
curl https://tu-dominio.com/api/products
# Esperado: Array JSON de productos
```

### Test 5: Upload (Requiere Auth)
```bash
# Se valida automáticamente en admin panel
curl -X POST https://tu-dominio.com/api/upload/image \
  -F "file=@imagen.jpg"
# Sin cookie: 401 Unauthorized ✓
```

---

## 📊 Monitoreo & Logs

### Ver Logs en Vivo (Docker)
```bash
ssh -i "$HOME\.ssh\id_ed25519" root@TU_VPS_IP \
  docker-compose -f /home/cero-uno-app/docker-compose.yml logs -f
```

### Ver Logs (PM2 - sin Docker)
```bash
pm2 logs cero-uno
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Error: ADMIN_SESSION_SECRET is required` | Variable no configurada | Ver sección "Variables de Entorno" |
| `Port 3000 already in use` | Otro proceso usa puerto | `lsof -i :3000` y matar proceso |
| `Cannot find module 'next'` | node_modules no instalados | `pnpm install --frozen-lockfile` |
| `EACCES: permission denied` | Permisos de archivo | `chmod 644 lib/products.json` |
| `JSON decode error in products.json` | Archivo corrupto | Recrear: `npm run init-products` |

---

## 🔐 Security Checklist

- [ ] Variables sensibles en .env.production (NO en git)
- [ ] ADMIN_SESSION_SECRET ≥ 32 caracteres aleatorios
- [ ] ADMIN_PASSWORD ≥ 20 caracteres con mix
- [ ] SSL/HTTPS funcionando (Let's Encrypt)
- [ ] Firewall: Solo puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] SSH key-only auth (deshabilitar password SSH)
- [ ] Backups automáticos configurados
- [ ] Logs monitoreados regularmente
- [ ] Rate limiting en login activo (verificar en `/api/auth/login`)

---

## 📁 Estructura de Archivos para Deploy

```
/home/cero-uno/ (o /home/cero-uno-app con Docker)
├── .git/                      # Repositorio
├── .next/                     # Build output (generado con npm run build)
├── node_modules/              # Dependencias (generado con npm install)
├── lib/
│  ├── products.json           # 📍 PERSISTENTE - Backup regular
│  ├── auth.ts
│  └── ...
├── public/
│  ├── images/
│  │  └── products/            # 📍 PERSISTENTE - Backup regular
│  └── videos/
│     └── products/            # 📍 PERSISTENTE - Backup regular
├── .env.production            # 📍 NO COMMITEAR - Crear en servidor
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
├── docker-compose.yml
├── next.config.mjs
├── tsconfig.json
└── tailwind.config.ts
```

**Carpetas Críticas (Backup):**
- `lib/products.json` - Base de datos de productos
- `public/images/products/` - Imágenes uploaded
- `public/videos/products/` - Videos uploaded

**Dónde NO ir:**
- ❌ No committear `.env.production`
- ❌ No committear `node_modules/`
- ❌ No committear `.next/` (se regenera con build)

---

## 🚀 Quick Deploy Command (After SSH)

```bash
# One-liner completo (reemplaza valores!)
cd /home/cero-uno && \
git pull origin main && \
pnpm install --frozen-lockfile && \
pnpm build && \
restart-app  # pm2 restart cero-uno O docker-compose restart
```

---

## 📞 Troubleshooting Hostinger-Specific

### "My Site Not Working" - Paso a Paso

1. **SSH al servidor**
   ```bash
   ssh -i "$HOME\.ssh\id_ed25519" root@TU_VPS_IP
   ```

2. **Verifica Node corriendo**
   ```bash
   ps aux | grep -E "node|docker" | grep -v grep
   ```

3. **Verifica Logs**
   ```bash
   pm2 logs cero-uno  # si uses PM2
   # O
   docker-compose logs --tail=50  # si uses Docker
   ```

4. **Prueba conectividad**
   ```bash
   curl http://localhost:3000
   ```

5. **Verifica variables env**
   ```bash
   printenv | grep -E "NODE_ENV|ADMIN"
   ```

6. **Reinicia aplicación**
   ```bash
   pm2 restart cero-uno && pm2 logs cero-uno
   # O
   docker-compose restart && docker-compose logs -f
   ```

---

## ✅ Final Checklist Before Production Go-Live

- [ ] `npm run build` ejecuta sin errores localmente
- [ ] `.env.production` NOT en git (verificar con `git log --all -- .env.production`)
- [ ] Versión Node especificada en `package.json` → `engines`
- [ ] `node_modules/` en .gitignore
- [ ] SSH keys configuradas en Hostinger
- [ ] Variables de entorno ingresadas en panel Hostinger
- [ ] Deployment script testeado (init-deployment.sh)
- [ ] app inicia sin errores (`curl http://localhost:3000` → 200 OK)
- [ ] Admin login funciona
- [ ] Backups configurados
- [ ] SSL/HTTPS verificado
- [ ] Firewall correctamente configurado
- [ ] Logs siendo monitoreados
- [ ] Dominio apuntando a VPS IP

**¡Listo para PRODUCCIÓN! 🚀**
