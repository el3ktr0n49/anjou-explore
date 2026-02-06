# Multi-stage build for Anjou Explore (Astro + Bun)
# Stage 1: Dependencies and Build
FROM oven/bun:1-alpine AS builder

WORKDIR /build

# Copy package files
COPY package.json bun.lockb ./

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build Astro application
RUN bun run build

# Stage 2: Production image
FROM oven/bun:1-alpine

# Metadata
LABEL maintainer="Anjou Explore <anjouexplore@gmail.com>"
LABEL description="Anjou Explore - Site web et gestion des événements"
LABEL version="1.0.0"

WORKDIR /app

# Install production dependencies only
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy Prisma files and generated client
COPY --from=builder /build/prisma ./prisma
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/node_modules/@prisma ./node_modules/@prisma

# Copy built application from builder
COPY --from=builder /build/dist ./dist

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
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application (Astro standalone server with Node adapter)
CMD ["bun", "run", "./dist/server/entry.mjs"]
