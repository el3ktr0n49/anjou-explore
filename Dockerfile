# Multi-stage build for Anjou Explore (Astro + Bun)
# Stage 1: Dependencies and Build
FROM oven/bun:1.3.8-alpine AS builder

WORKDIR /build

# Install build tools for Sharp (native image processing library)
# Sharp nécessite python3, make, g++ pour compiler ses binaires natifs
# vips-dev fournit libvips requis par Sharp
# RUN apk add --no-cache \
#     python3 \
#     make \
#     g++ \
#     vips-dev

# Copy package files
COPY package.json bun.lock ./

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build Astro application
# Note: DATABASE_URL requis par Prisma client même au build (import du module)
# Valeur factice OK car aucune connexion DB réelle pendant le build
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public" bun run build

# Stage 2: Production image
FROM oven/bun:1.3.8-alpine

# Metadata
LABEL maintainer="Anjou Explore <anjouexplore@gmail.com>"
LABEL description="Anjou Explore - Site web et gestion des événements"
LABEL version="1.0.0"

WORKDIR /app

# Copy package files (needed for bun runtime)
COPY package.json bun.lock ./

# Copy ALL node_modules from builder (includes compiled Sharp binaries)
# Note: Inclut les devDependencies (~100MB extra) mais évite la recompilation de Sharp
# Alternative : bun install --production nécessite python3/make/g++/vips-dev (layers lourds)
# Trade-off : 981MB (copie complète) vs 1.1GB (install prod + build tools)
COPY --from=builder /build/node_modules ./node_modules

# Copy Prisma files
COPY --from=builder /build/prisma ./prisma

# Copy Prisma config (workaround for Prisma 7.2.0 DATABASE_URL bug)
COPY --from=builder /build/prisma.config.ts ./prisma.config.ts

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Copy scripts directory (for init-db.ts migration script)
COPY --from=builder /build/scripts ./scripts
COPY --from=builder /build/src/lib ./src/lib

# Copy necessary runtime files
COPY astro.config.mjs ./
COPY tsconfig.json ./

# Create writable tmp directory (for readOnlyRootFilesystem)
RUN mkdir -p /tmp /app/.astro && \
    chown -R bun:bun /tmp /app/.astro

# Switch to non-root user (bun user exists in oven/bun image)
USER bun

# Expose port
EXPOSE 4321

# Set environment variables for runtime
ENV HOST=0.0.0.0
ENV PORT=4321

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD bun -e "fetch('http://localhost:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application (Astro standalone server with Node adapter)
CMD ["bun", "run", "./dist/server/entry.mjs"]
