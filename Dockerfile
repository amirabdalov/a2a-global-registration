FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build
RUN npm prune --production

EXPOSE 5000

# 1. Restore DB from GCS  2. Start the app
CMD ["sh", "-c", "node restore-db.mjs && node dist/index.cjs"]
