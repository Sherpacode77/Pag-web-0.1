# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm globalmente y dependencias
RUN npm install -g pnpm@10.29.2 && pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build de Next.js
RUN pnpm build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@10.29.2

# Copiar solo node_modules y build del stage anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copiar otros archivos necesarios en runtime
COPY lib ./lib
COPY next.config.mjs ./next.config.mjs
COPY tsconfig.json ./tsconfig.json
COPY tailwind.config.ts ./tailwind.config.ts
COPY postcss.config.mjs ./postcss.config.mjs

# Puerto por defecto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js en modo producción
CMD ["pnpm", "start"]
