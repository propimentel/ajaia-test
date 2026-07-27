# syntax=docker/dockerfile:1.7

############################
# Base: pnpm + Node 20
############################
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# openssl is needed so Prisma detects debian-openssl-3.0.x during
# `prisma generate` instead of defaulting to 1.1.x.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
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
# Copy the entire workspace from the backend-build stage. This
# includes node_modules (with the generated Prisma client), the
# compiled dist, and the prisma schema. We intentionally avoid
# reinstalling deps here because pnpm's filtered/ignore-scripts
# installs don't reliably link the prisma CLI bin, and pnpm deploy
# drops the generated .prisma/client files.
############################
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Full workspace from backend-build: node_modules (with generated
# Prisma client), dist, prisma schema, shared package dist.
COPY --from=backend-build /repo /repo

# Frontend dist (served at the root by NestJS via @nestjs/serve-static).
COPY --from=frontend-build /repo/apps/frontend/dist /app/public

WORKDIR /repo/apps/backend
EXPOSE 8080
CMD ["node", "dist/main.js"]
