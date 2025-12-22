# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for build (if needed)
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prompts directory - required for admin API to write prompt updates
# The admin API writes updated prompts to files in this directory at runtime
COPY --from=builder /app/prompts ./prompts

# Create data directory for SQLite database
# Note: In Cloud Run, this will be ephemeral unless using Cloud Filestore mount
# The directory must exist and be writable for the database to be created
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Ensure prompts directory is writable for runtime updates
RUN chown -R nextjs:nodejs /app/prompts

# Set correct permissions for all app files
RUN chown -R nextjs:nodejs /app

USER nextjs

# Cloud Run uses PORT environment variable
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

EXPOSE 8080

CMD ["node", "server.js"]
