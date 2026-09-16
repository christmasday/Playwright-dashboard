# Backend Dockerfile
FROM node:22-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Production image, copy all the files and run server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 playwright

COPY --from=deps /app/package*.json ./
COPY --from=deps --chown=playwright:nodejs /app/node_modules ./node_modules
COPY --chown=playwright:nodejs ./src ./src

RUN mkdir -p /app/uploads/artifacts && chown -R playwright:nodejs /app/uploads

USER playwright

EXPOSE 3001

CMD ["node", "src/server.js"]
