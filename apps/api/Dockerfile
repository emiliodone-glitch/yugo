# Yugo API — multi-stage build for the pnpm monorepo.
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# ---- deps: install with the lockfile, workspace-aware -----------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ---- build: compile shared packages, generate Prisma client, build Nest -----
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @yugo/ui-tokens build \
 && pnpm --filter @yugo/shared build \
 && pnpm --filter @yugo/api exec prisma generate \
 && pnpm --filter @yugo/api build

# ---- runtime: production dependencies only ---------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/ui-tokens/dist packages/ui-tokens/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/node_modules/.prisma node_modules/.prisma

# Never run as root in production.
RUN addgroup -S yugo && adduser -S yugo -G yugo
USER yugo

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:4000/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
