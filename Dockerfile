FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 a2auser
COPY --from=builder --chown=a2auser:nodejs /app/dist ./dist
COPY --from=builder --chown=a2auser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=a2auser:nodejs /app/package.json ./package.json
USER a2auser
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
