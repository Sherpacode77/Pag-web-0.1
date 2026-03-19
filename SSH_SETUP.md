# SSH Setup para Deploy en Hostinger

## ✅ Paso 1: Clave SSH Generada

Tu clave SSH ED25519 ha sido creada exitosamente:

**Ubicación de las claves:**
- **Privada (no compartir):** `C:\Users\RYZEN\.ssh\id_ed25519`
- **Pública (para Hostinger):** `C:\Users\RYZEN\.ssh\id_ed25519.pub`

**Fingerprint (para verificar):**
```
SHA256:cg3Or8xBQ+w6OBUu6ATdKqGp40Z05uuCsY967OfPJI8 equipo@cerounobikes.com
```

---

## 📋 Paso 2: Agregar Clave Pública en Hostinger Panel

### Tu Clave Pública:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIjM+/CZXceRtBGZomJ/YXoV8TbI76U4Fi3/VOntOkat equipo@cerounobikes.com
```

### Instrucciones:

1. **Accede a Hostinger Panel de Control**
   - Ve a: https://www.hostinger.com/dashboard
   - Inicia sesión con tu cuenta

2. **Busca SSH Keys**
   - Menú: Panel > VPS > Tu VPS > SSH Keys
   - O: Configuración > SSH Keys

3. **Agrega Nueva Clave**
   - Click en "Add SSH Key" o "Nueva Clave SSH"
   - Pega tu clave pública en el campo de contenido
   - Nombre de la clave: `CERO-UNO-DEV` (o lo que prefieras)
   - **IMPORTANTE:** Asegúrate de copiar **TODA** la línea (desde `ssh-ed25519` hasta `equipo@cerounobikes.com`)

4. **Guarda y Obtén tu IP/Host**
   - Nota tu IP del VPS (ej: `123.45.67.89`)
   - O tu hostname Hostinger (ej: `vps12345.hostinger.net`)

---

## 🔐 Paso 3: Verificar Conexión SSH (Windows PowerShell)

```powershell
# Test de conexión (reemplaza IP_O_HOST con tu IP/hostname Hostinger)
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@IP_O_HOST

# Ejemplo:
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@123.45.67.89
```

**Resultado esperado:**
```
Welcome to Hostinger VPS
root@your-vps:~#
```

---

## 🚀 Paso 4: Deploy Automático

Una vez verificada la conexión SSH, ejecuta el script de deployment:

```powershell
# Desde tu máquina local
$VPS_IP = "tu-ip-o-hostname"
$REPO = "https://github.com/Jdlopezva/v0-drive-content-retrieval.git"

# Conectarse y ejecutar script
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@$VPS_IP < .\scripts\init-deployment.sh
```

O manualmente:

```powershell
# 1. Conectarse
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@$VPS_IP

# 2. En el servidor, ejecutar:
cd /home/cero-uno-app
docker-compose logs -f app
```

---

## 🛠️ Útiles: Comandos SSH Frecuentes

### Ver logs en vivo:
```powershell
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@IP_O_HOST docker-compose -f /home/cero-uno-app/docker-compose.yml logs -f app
```

### Reiniciar aplicación:
```powershell
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@IP_O_HOST docker-compose -f /home/cero-uno-app/docker-compose.yml restart
```

### Actualizar código:
```powershell
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@IP_O_HOST "cd /home/cero-uno-app && git pull && docker-compose build && docker-compose up -d"
```

### Conectar bash interactivo:
```powershell
ssh -i "C:\Users\RYZEN\.ssh\id_ed25519" root@IP_O_HOST bash
```

---

## 🔒 Seguridad - Respetar tu Clave Privada

### ⚠️ NUNCA:
- ❌ Compartas el archivo `id_ed25519`
- ❌ Lo subas a GitHub
- ❌ Lo envíes por email

### ✅ SÍ:
- ✅ Guarda backups seguros (disco externo)
- ✅ Restringe permisos: `icacls "$HOME\.ssh\id_ed25519" /inheritance:r /grant:r "$env:USERNAME`:(F)"`
- ✅ Si la comprometés, elimínala en Hostinger inmediatamente

---

## 📝 Troubleshooting

### "Permission denied (publickey)"
- Verifica que la clave pública en Hostinger está completa (sin saltos de línea)
- Verifica que es la clave correcta (fingerprint debe coincidir)
- Intenta: `ssh-keyscan -t ed25519 IP_O_HOST >> ~/.ssh/known_hosts`

### "ssh: command not found" (Windows)
- PowerShell 5.1+ tiene SSH integrado
- O instala: `choco install openssh` (si usas Chocolatey)
- O descarga: [Git for Windows](https://git-scm.com/) (incluye SSH)

### Timeout o no responde
- Verifica que la IP/hostname es correcta
- Verifica que el firewall permite puerto 22
- Contacta a Hostinger support

---

## ✅ Checklist Final

- [ ] Clave SSH ED25519 generada en `C:\Users\RYZEN\.ssh\id_ed25519`
- [ ] Clave pública agregada en Hostinger Panel
- [ ] Conexión SSH verificada desde PowerShell
- [ ] Script `init-deployment.sh` listo en `scripts/`
- [ ] DEPLOYMENT_HOSTINGER.md disponible como referencia
- [ ] .env.production.example en repo
- [ ] Docker files (Dockerfile, docker-compose.yml) en repo

**¡Listo para deploy en Hostinger! 🚀**
