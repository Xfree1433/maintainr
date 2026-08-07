FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
# Pre-compile the admin bootstrap into a self-contained ESM bundle.
# The runner is a Next.js *standalone* image: it has no tsx, no devDependencies,
# and the generated Prisma client is TypeScript-only (provider = "prisma-client",
# 30 .ts files / 0 .js), so `npx tsx prisma/bootstrap-admin.ts` cannot run there.
# Bundling here — where the full toolchain exists — inlines the client, the pg
# adapter, bcryptjs and dotenv, leaving only `pg` external (it IS in the
# standalone node_modules). Must be ESM: the generated client reads
# `import.meta.url`, which is empty under CJS.
RUN npm run build:bootstrap-admin
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
