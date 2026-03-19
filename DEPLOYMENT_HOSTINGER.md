# Deployment Guide - CERO.UNO en Hostinger

## Requisitos Previos
1. **Hostinger VPS** con Docker instalado
2. **SSH access** a tu servidor
3. **Dominio** apuntando a tu VPS IP
4. **SSH key** configurada para no requerir password

## Paso 1: Preparar el Servidor Hostinger

```bash
# Conectarse al VPS
ssh root@YOUR_VPS_IP

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker (si no está instalado)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Crear directorio para la aplicación
mkdir -p /home/cero-uno
cd /home/cero-uno
```

## Paso 2: Clonar el Repositorio

```bash
# En el servidor Hostinger
git clone https://github.com/Jdlopezva/v0-drive-content-retrieval.git .
```

## Paso 3: Configurar Variables de Entorno

```bash
# Crear archivo .env.production en el servidor
cat > .env.production << 'EOF'
NODE_ENV=production

# Credentials - CAMBIAR ESTOS!
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_contraseña_muy_segura_aqui

# Session secret - Generar con: openssl rand -base64 32
ADMIN_SESSION_SECRET=generar-con-openssl-rand-base64-32
EOF

chmod 600 .env.production
```

### Generar Secret Seguro:
```bash
openssl rand -base64 32
# Copiar salida y usar en ADMIN_SESSION_SECRET
```

## Paso 4: Construir e Iniciar Contenedor

```bash
# En /home/cero-uno
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

## Paso 5: Verificar Funcionamiento

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Test del sitio
curl http://localhost:3000

# Test del login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tu_usuario_admin","password":"tu_contraseña_aqui"}'
```

## Paso 6: Configurar Nginx como Reverse Proxy (Hostinger)

Si Hostinger tiene Nginx:

```bash
# Crear/editar configuración Nginx
sudo nano /etc/nginx/sites-available/cero.uno

# Contenido:
server {
    listen 80;
    listen [::]:80;
    server_name cero.uno www.cero.uno;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/cero.uno /etc/nginx/sites-enabled/

# Pruebar sintaxis
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

## Paso 7: SSL con Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generar certificado
sudo certbot --nginx -d cero.uno -d www.cero.uno

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Paso 8: Configurar Auto-backup y Monitoreo

### Backup de Volúmenes Docker
```bash
# Script diario /home/cero-uno/backup.sh
#!/bin/bash
BACKUP_DIR="/backups/cero-uno"
mkdir -p $BACKUP_DIR
docker run --rm \
  -v cero-uno_products_data:/data \
  -v $BACKUP_DIR:/backup \
  busybox tar czf /backup/products-$(date +%Y-%m-%d).tar.gz /data

# Cron: editar con `crontab -e`
0 2 * * * /home/cero-uno/backup.sh
```

### Monitoreo
```bash
# Ver status
docker-compose ps

# Ver logs en vivo
docker-compose logs -f app

# Verificar salud
docker-compose exec app curl http://localhost:3000/api/auth/session
```

## Paso 9: Actualizaciones y Mantenimiento

```bash
# Tirar cambios nuevos
cd /home/cero-uno
git pull

# Reconstruir imagen
docker-compose build --no-cache

# Reiniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

## Troubleshooting

### Contenedor no inicia
```bash
docker-compose logs app
# Busca errores en ADMIN_SESSION_SECRET o variables de entorno
```

### Puerto 3000 en uso
```bash
docker-compose down
# O cambiar en docker-compose.yml: ports: "3001:3000"
```

### Productos.json no persiste
```bash
# Verificar volúmenes
docker volume ls
docker volume inspect cero-uno_products_data

# Recrear volumen si es necesario
docker volume rm cero-uno_products_data
docker-compose up -d
```

### SSL no renueva automáticamente
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## Checklist de Seguridad Producción

- [ ] ADMIN_SESSION_SECRET ≥ 32 caracteres (generado con openssl)
- [ ] ADMIN_PASSWORD muy segura (mín. 20+ caracteres, mix de mayúsculas/números/símbolos)
- [ ] Firewall configurado (solo puertos 22, 80, 443)
- [ ] SSH key-only auth (deshabilitar password)
- [ ] Backups automáticos configurados
- [ ] SSL/HTTPS funcionando
- [ ] Rate limiting verificado en login (`/api/auth/login`)
- [ ] Logs monitoreados regularmente
- [ ] Update system regularly: `sudo apt update && apt upgrade`

## Contacto y Soporte

Para problemas:
1. Revisar `docker-compose logs app`
2. Verificar variables .env.production
3. Validar permisos de volúmenes: `ls -la /var/lib/docker/volumes/`
