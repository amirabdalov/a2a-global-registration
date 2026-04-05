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
ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
