FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=dependencies /app/node_modules ./node_modules
RUN ./node_modules/.bin/playwright-core install-deps firefox
RUN mkdir -p /app/storage /home/nextjs/.cache/camoufox && chown -R nextjs:nodejs /app/storage /home/nextjs
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:24-bookworm-slim AS worker
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules
RUN ./node_modules/.bin/playwright-core install-deps firefox
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
CMD ["npm", "run", "worker"]
