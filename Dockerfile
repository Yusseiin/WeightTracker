# -------------------------------------------------------
# Stage 1 — Build stage
# -------------------------------------------------------
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable

# Working directory inside container
WORKDIR /app

# Copy package definitions first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies --frozen-lockfile
RUN pnpm install 

# Copy all source code
COPY . .

# ✅ Build-time environment variables (NEXT_PUBLIC_* must be set at build time)
ARG NEXT_PUBLIC_VERSION

ENV NEXT_PUBLIC_VERSION=$NEXT_PUBLIC_VERSION

# ✅ Build Next.js
RUN pnpm run build

# -------------------------------------------------------
# Stage 2 — Production runtime
# -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Install shadow for usermod/groupmod, su-exec for running as different user (needed for PUID/PGID on Unraid),
# and ffmpeg for media info extraction (codec detection)
RUN apk add --no-cache shadow su-exec ffmpeg

ENV NODE_ENV=production

# Set default paths (these are the paths INSIDE the container)
# Users mount their host paths to these container paths via volumes

ENV CONFIG_PATH=/config

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
