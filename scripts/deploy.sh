#!/usr/bin/env bash
#
# Deploy de cerounobikes.com a Hostinger (shared hosting + Passenger).
#
# Uso, desde Git Bash en la raiz del proyecto:
#   ./scripts/deploy.sh              # build + subida + reinicio
#   ./scripts/deploy.sh --dry-run    # build y empaquetado, sin tocar produccion
#   ./scripts/deploy.sh --list       # muestra los respaldos disponibles
#   ./scripts/deploy.sh --rollback 1 # vuelve al respaldo mas reciente (1 = anterior)
#   ./scripts/deploy.sh --rollback 2 # vuelve dos versiones atras
#
# NOTA: los .md del repo (DEPLOYMENT_HOSTINGER.md, SSH_SETUP.md) describen un
# VPS con Docker que ya no se usa. La infraestructura real es la de abajo.

set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_HOST="u896969397@46.202.145.25"
SSH_PORT="65002"
APP_DIR="~/domains/cerounobikes.com/nodejs"
SITE_URL="https://cerounobikes.com"

# Cuantos deploys anteriores se conservan. Cada respaldo pesa ~16 MB mientras el
# empaquetado siga excluyendo .next/dev y .next/cache, asi que 8 cuesta ~130 MB:
# irrelevante. El numero no importa solo para retroceder — de cada respaldo se
# recuperan los estaticos (ver mas abajo), asi que la ventana define cuantos
# deploys de antiguedad puede tener el HTML cacheado de un visitante sin que la
# pagina le reviente con 'client-side exception'.
RETAIN_BACKUPS="${RETAIN_BACKUPS:-8}"

SSH="ssh -i $SSH_KEY -p $SSH_PORT $SSH_HOST"
TARBALL="$(mktemp -d)/deploy.tar.gz"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

list_backups() {
  say "Respaldos en produccion (del mas reciente al mas antiguo)"
  $SSH "cd $APP_DIR && for d in \$(ls -d .next.bak-deploy-* 2>/dev/null | sort -r); do
          printf '  %s  %6s  %s  (build %s)\n' \
            \"\$(stat -c %y \"\$d\" | cut -d. -f1)\" \"\$(du -sh \"\$d\" | cut -f1)\" \"\$d\" \
            \"\$(cat \"\$d/BUILD_ID\" 2>/dev/null || echo '?')\"
        done
        echo
        echo \"  EN VIVO ahora: \$(cat .next/BUILD_ID 2>/dev/null)\""
}

rollback() {
  local n="$1"
  [[ "$n" =~ ^[0-9]+$ ]] || die "--rollback espera un numero (1 = version anterior)"
  say "Retrocediendo $n version(es)"
  $SSH "set -e
    cd $APP_DIR
    TARGET=\$(ls -d .next.bak-deploy-* 2>/dev/null | sort -r | sed -n '${n}p')
    [ -n \"\$TARGET\" ] || { echo 'No hay un respaldo en esa posicion.'; exit 1; }
    echo \"Restaurando \$TARGET (build \$(cat \$TARGET/BUILD_ID 2>/dev/null))\"
    # El build vigente se guarda antes de pisarlo, para poder deshacer el rollback.
    cp -r .next \".next.bak-deploy-\$(date +%s)\"
    rm -rf .next
    cp -r \"\$TARGET\" .next
    chmod -R 755 .next
    mkdir -p tmp && touch tmp/restart.txt
    echo \"Ahora en vivo: \$(cat .next/BUILD_ID)\""
  verify
}

verify() {
  # $1 (opcional): BUILD_ID esperado. Next incrusta el buildId en el HTML, asi
  # que sirve para distinguir "respondio 200" de "respondio 200 con la version
  # NUEVA" — tras un reinicio una pagina estatica puede seguir sirviendose
  # cacheada unos segundos y un 200 solo no lo delata.
  local expected="${1:-}"
  say "Verificando el sitio"
  sleep 10
  local code
  for path in "/" "/tienda" "/contacto" "/api/products"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$SITE_URL$path")
    printf '  %-16s HTTP %s\n' "$path" "$code"
    [ "$code" = "200" ] || die "$path respondio $code — revisa console.log en el servidor"
  done

  [ -n "$expected" ] || return 0

  say "Comprobando que se sirva el build nuevo"
  local tries=0
  while [ $tries -lt 6 ]; do
    if curl -s --max-time 30 "$SITE_URL/" | grep -q "$expected"; then
      echo "  OK: el sitio sirve $expected"
      return 0
    fi
    tries=$((tries + 1))
    echo "  todavia cacheado, reintento $tries/6..."
    sleep 10
  done
  printf '\n\033[33mAVISO: tras 60s el sitio sigue sirviendo una version cacheada.\033[0m\n'
  echo "  El build SI quedo instalado (BUILD_ID remoto ya verificado)."
  echo "  Suele resolverse solo; si no, vuelve a tocar tmp/restart.txt."
}

case "${1:-}" in
  --list)     list_backups; exit 0 ;;
  --rollback) rollback "${2:-1}"; exit 0 ;;
esac

DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

say "Compilando"
# .env.local trae NEXT_PUBLIC_SITE_URL=http://localhost:3000 y en Next.js pisa a
# .env. Si no se fuerza aca, el dominio equivocado queda incrustado en el build
# — es la misma causa de la caida del checkout de agosto 2026.
export NEXT_PUBLIC_SITE_URL="$SITE_URL"
export SITE_URL="$SITE_URL"
export NODE_ENV=production
npx next build > /dev/null || die "el build fallo"

BUILD_ID=$(cat .next/BUILD_ID)
echo "  BUILD_ID: $BUILD_ID"

say "Empaquetando"
# .next/dev son ~250 MB que deja 'next dev --turbo' y no sirven en produccion;
# sin esta exclusion cada respaldo pesaria 250 MB en vez de 16 MB.
tar -czf "$TARBALL" \
  --exclude='.next/dev' --exclude='.next/cache' --exclude='*.map' \
  .next app components lib hooks
echo "  $(du -h "$TARBALL" | cut -f1)"

if $DRY_RUN; then
  say "--dry-run: no se toco produccion"
  echo "  paquete en $TARBALL"
  exit 0
fi

# public/ no va en el tarball: pesa ~170 MB y cambia poco. Se suben solo los
# archivos que faltan en produccion o que pesan distinto, comparando listados.
# Sin esto, una imagen nueva queda rota en el sitio aunque el deploy diga OK
# (paso exactamente eso con las fotos de CERO.UNO Travel).
say "Sincronizando public"
REMOTE_LIST=$(mktemp)
LOCAL_LIST=$(mktemp)
PENDING=$(mktemp)
$SSH "cd $APP_DIR && find public -type f -printf '%s %p
' 2>/dev/null | sort" > "$REMOTE_LIST" || true
find public -type f -printf '%s %p
' | sort > "$LOCAL_LIST"
# Las rutas con espacios se comparan completas: se corta solo por el primer campo.
comm -23 "$LOCAL_LIST" "$REMOTE_LIST" | cut -d' ' -f2- | sort -u > "$PENDING"
PENDING_COUNT=$(wc -l < "$PENDING" | tr -d ' ')

if [ "$PENDING_COUNT" = "0" ]; then
  echo "  sin cambios"
else
  echo "  $PENDING_COUNT archivo(s) por subir"
  ASSETS="$(mktemp -d)/public.tar.gz"
  tar -czf "$ASSETS" -T "$PENDING"
  echo "  $(du -h "$ASSETS" | cut -f1)"
  scp -i "$SSH_KEY" -P "$SSH_PORT" "$ASSETS" "$SSH_HOST:$APP_DIR/public-assets.tar.gz"
  $SSH "set -e
    cd $APP_DIR
    tar -xzf public-assets.tar.gz
    rm public-assets.tar.gz
    chmod -R 755 public"
  rm -f "$ASSETS"
fi
rm -f "$REMOTE_LIST" "$LOCAL_LIST" "$PENDING"

say "Subiendo"
scp -i "$SSH_KEY" -P "$SSH_PORT" "$TARBALL" "$SSH_HOST:$APP_DIR/deploy.tar.gz"

say "Instalando y rotando respaldos"
$SSH "set -e
  cd $APP_DIR
  # Se respalda el build vigente ANTES de pisarlo, salvo que el mas reciente ya
  # sea de ese mismo BUILD_ID: un respaldo duplicado gasta un turno de la
  # rotacion y expulsa antes de tiempo una version que si era distinta.
  LIVE=\$(cat .next/BUILD_ID 2>/dev/null || echo none)
  NEWEST=\$(ls -d .next.bak-deploy-* 2>/dev/null | sort -r | head -1)
  PREV=\$(cat \"\$NEWEST/BUILD_ID\" 2>/dev/null || echo none)
  if [ \"\$LIVE\" = \"\$PREV\" ]; then
    echo \"  (el build en vivo \$LIVE ya esta respaldado; no se duplica)\"
  else
    cp -r .next \".next.bak-deploy-\$(date +%s)\"
  fi
  rm -rf .next
  tar -xzf deploy.tar.gz
  rm deploy.tar.gz

  # Los estaticos de builds anteriores se vuelven a poner en su sitio. Un
  # visitante que ya tenia el HTML del build viejo (cacheado en su navegador o
  # en una pestana abierta) sigue pidiendo LOS CHUNKS DE ESE BUILD: si el deploy
  # los borro, recibe 404 y la pagina muere con 'a client-side exception has
  # occurred'. cp -n nunca pisa un archivo del build nuevo.
  for BAK in \$(ls -d .next.bak-deploy-* 2>/dev/null | sort -r); do
    [ -d \"\$BAK/static\" ] && cp -rn \"\$BAK/static/.\" .next/static/ 2>/dev/null || true
  done
  chmod -R 755 .next

  # Rotacion: se conservan los $RETAIN_BACKUPS mas recientes y se borra el resto.
  OLD=\$(ls -d .next.bak-deploy-* 2>/dev/null | sort -r | tail -n +\$(($RETAIN_BACKUPS + 1)))
  if [ -n \"\$OLD\" ]; then
    echo \"  purgando: \$(echo \$OLD | wc -w) respaldo(s) fuera de la ventana de $RETAIN_BACKUPS\"
    echo \"\$OLD\" | xargs rm -rf
  fi

  mkdir -p tmp && touch tmp/restart.txt
  echo \"  desplegado: \$(cat .next/BUILD_ID)\"
  echo \"  respaldos:  \$(ls -d .next.bak-deploy-* 2>/dev/null | wc -l)\""

REMOTE_ID=$($SSH "cat $APP_DIR/.next/BUILD_ID")
[ "$REMOTE_ID" = "$BUILD_ID" ] || die "el BUILD_ID remoto ($REMOTE_ID) no coincide con el local ($BUILD_ID)"

verify "$BUILD_ID"

say "Listo — $BUILD_ID en vivo"
list_backups
