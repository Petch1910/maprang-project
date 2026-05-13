FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app
COPY apps/backend/package.json apps/backend/bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./
COPY knowledge ./knowledge
RUN bunx prisma generate
EXPOSE 3000
CMD ["bun", "run", "start"]
