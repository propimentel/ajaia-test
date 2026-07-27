# syntax=docker/dockerfile:1.7

############################
# Build
############################
FROM node:20-slim AS build
ARG VITE_API_URL=/api
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV VITE_API_URL=$VITE_API_URL
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @ajaia/frontend... --frozen-lockfile=false

COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
RUN pnpm --filter @ajaia/shared build
RUN pnpm --filter @ajaia/frontend build

############################
# Runtime — nginx:alpine
############################
FROM nginx:alpine AS runtime

# Runtime env vars (substituted by entrypoint)
ENV BACKEND_URL=http://localhost:3001
ENV PORT=8080

COPY apps/frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html

EXPOSE 8080

# Use a tiny entrypoint that runs envsubst on the template then starts nginx.
COPY apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's|\r$||' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
