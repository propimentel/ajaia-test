# syntax=docker/dockerfile:1.7

############################
# Base: pnpm + Node 20
############################
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

############################
# Backend deps
############################
FROM base AS backend-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @ajaia/backend... --frozen-lockfile=false

############################
# Frontend deps
############################
FROM base AS frontend-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @ajaia/frontend... --frozen-lockfile=false

############################
# Build backend
############################
FROM backend-deps AS backend-build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN pnpm --filter @ajaia/shared build
RUN pnpm --filter @ajaia/backend exec prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter @ajaia/backend build

############################
# Build frontend (with /api so the SPA calls the same-origin backend)
############################
FROM frontend-deps AS frontend-build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
RUN pnpm --filter @ajaia/shared build
RUN pnpm --filter @ajaia/frontend build

############################
# Runtime: backend + static SPA, single container
#
# We do NOT use `pnpm deploy` to copy prod-only deps because pnpm's
# deploy layout does not reliably include the generated Prisma client
# files (.prisma/client/), which makes @prisma/client throw
# "@prisma/client did not initialize yet" on boot. Instead, the
# runtime stage installs the prod deps itself and re-runs
# `prisma generate` so the client is always present next to the
# compiled code.
############################
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PORT=8080
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Workspace metadata for a prod-only install of the backend.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY --from=backend-build /repo/apps/backend/package.json ./apps/backend/
COPY --from=backend-build /repo/packages/shared/package.json ./packages/shared/
# The backend depends on the shared package as `workspace:*`; for
# pnpm to install it without a built dist, provide the built shared
# package alongside the install (the `exports`/`main` point at the
# dist files we are about to copy).
COPY --from=backend-build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=backend-build /repo/packages/shared/package.json ./packages/shared/package.json

# We do NOT use --prod here because the prisma CLI is a devDependency
# of @ajaia/backend and we need it to run `prisma generate` in the
# next step. The extra bloat is small and Node won't import dev deps
# at runtime.

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @ajaia/backend... --frozen-lockfile=false --ignore-scripts

# Backend build output (dist + prisma schema).
COPY --from=backend-build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=backend-build /repo/apps/backend/prisma ./apps/backend/prisma

# Generate the Prisma client in this stage so it's present in
# node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client and
# @prisma/client can initialize on boot.
WORKDIR /repo/apps/backend
RUN pnpm exec prisma generate --schema=prisma/schema.prisma

# Frontend dist (served at the root by NestJS via @nestjs/serve-static).
COPY --from=frontend-build /repo/apps/frontend/dist /app/public

WORKDIR /repo/apps/backend
EXPOSE 8080
CMD ["node", "dist/main.js"]
