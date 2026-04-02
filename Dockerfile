# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 a2auser

# Copy built output
COPY --from=builder --chown=a2auser:nodejs /app/dist ./dist
COPY --from=builder --chown=a2auser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=a2auser:nodejs /app/package.json ./package.json

USER a2auser
EXPOSE 8080

CMD ["node", "dist/index.cjs"]
