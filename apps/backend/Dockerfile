# syntax=docker/dockerfile:1.7

############################
# Base deps (for build & runtime)
############################
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

############################
# Dependencies
############################
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @ajaia/backend... --frozen-lockfile=false

############################
# Build
############################
FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN pnpm --filter @ajaia/shared build
RUN pnpm --filter @ajaia/backend exec prisma generate --schema=apps/backend/prisma/schema.prisma
RUN pnpm --filter @ajaia/backend build
RUN pnpm deploy --filter @ajaia/backend --prod /prod/backend

############################
# Runtime
############################
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /prod/backend /app
COPY --from=build /repo/apps/backend/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/main.js"]
