FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (need devDependencies for build)
RUN npm ci

# Copy source
COPY . .

# Build
ENV NODE_ENV=production
RUN npm run build

# Clean up dev dependencies
RUN npm prune --production

# Run
EXPOSE 5000

# Cloud Run sets PORT env variable; app reads it with fallback to 5000
CMD ["node", "dist/index.cjs"]
