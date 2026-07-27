# Ajaia — Document Editor

Ajaia is a small, fast document editor. It is a full-stack monorepo with a
React + Vite frontend (Plate.js editor) and a Nest.js REST API backed by
Prisma + Postgres. It is built to be deployable to Google Cloud Run with
Supabase as the managed database, and runnable locally with Docker.

## Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │                   Browser                    │
                       └────────────────────┬─────────────────────────┘
                                            │ https
                                            ▼
                       ┌──────────────────────────────────────────────┐
                       │   Cloud Run: ajaia-frontend (nginx:alpine)   │
                       │  - Serves the React SPA                      │
                       │  - Proxies /api/* → BACKEND_URL              │
                       └────────────────────┬─────────────────────────┘
                                            │ https (internal)
                                            ▼
                       ┌──────────────────────────────────────────────┐
                       │   Cloud Run: ajaia-backend  (Node 20)        │
                       │   Nest.js REST API (/documents, /health)     │
                       └────────────────────┬─────────────────────────┘
                                            │ TCP (pooler / direct)
                                            ▼
                       ┌──────────────────────────────────────────────┐
                       │   Supabase Postgres (managed, us-east-2)     │
                       └──────────────────────────────────────────────┘
```

### Repository layout

```
ajaia/
├─ apps/
│  ├─ backend/    # Nest.js + Prisma REST API
│  └─ frontend/   # Vite + React + Tailwind + Shadcn + Plate.js
├─ packages/
│  └─ shared/     # Shared TypeScript DTOs (@ajaia/shared)
├─ docs/
│  ├─ IMPLEMENTATION_PLAN.md
│  └─ GCP_SUPABASE.md
├─ .github/workflows/deploy.yml
├─ docker-compose.yml
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker (for Postgres)

### First-time setup (required before the first `pnpm dev`)

The repo does **not** ship a `pnpm-lock.yaml` or a Prisma migration. Run these
once after cloning:

```bash
# 1. Install dependencies and generate the lockfile
pnpm install

# 2. Start Postgres
pnpm db:up

# 3. Create the initial Prisma migration
pnpm db:migrate --name init

# 4. Commit the lockfile and the migration (apps/backend/prisma/migrations/)
```

After that, subsequent dev sessions only need `pnpm db:up && pnpm dev`.

### Quickstart (day-to-day)

```bash
# 1. Start Postgres
pnpm db:up

# 2. Copy env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. Start dev servers (backend on :3001, frontend on :5173)
pnpm dev
```

The frontend proxies nothing in dev — it talks to the backend at the URL
configured via `VITE_API_URL` (default `http://localhost:3001`).

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Runs all workspaces in parallel via Turborepo. |
| `pnpm build` | Builds shared, backend, frontend. |
| `pnpm lint` | Runs ESLint in every workspace. |
| `pnpm typecheck` | Runs `tsc --noEmit` in every workspace. |
| `pnpm test` | Runs unit tests (Vitest / Jest). |
| `pnpm db:up` / `pnpm db:down` | Starts/stops the local Postgres container. |
| `pnpm db:migrate` | Runs Prisma migrations in dev mode. |
| `pnpm db:deploy` | Runs `prisma migrate deploy` (used in CI). |
| `pnpm db:studio` | Opens Prisma Studio. |
| `pnpm format` | Runs Prettier. |

## API

The backend exposes a tiny REST API under `/documents`:

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET`    | `/documents`         | — | `DocumentMeta[]` (id, title, updatedAt) |
| `GET`    | `/documents/:id`     | — | `DocumentDto` |
| `POST`   | `/documents`         | `{ title?, content? }` | `DocumentDto` |
| `PATCH`  | `/documents/:id`     | `{ title?, content? }` | `DocumentDto` |
| `DELETE` | `/documents/:id`     | — | `204 No Content` |
| `GET`    | `/health`            | — | `{ status, db, uptime, timestamp }` |

The exact request/response types live in [`packages/shared`](./packages/shared).

## Environment variables

| Name | Used by | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | backend | yes | — | Postgres connection string. |
| `PORT` | backend | no | `3001` (local) / `8080` (container) | HTTP port. |
| `FRONTEND_URL` | backend | yes | `http://localhost:5173` | CORS allow-list. |
| `VITE_API_URL` | frontend (build-time) | no | `http://localhost:3001` | API base URL. Use `/api` to go through nginx. |
| `BACKEND_URL` | frontend container | no | `http://localhost:3001` | Runtime env var used by nginx to proxy `/api/*`. |

`.env.example` files are committed in each app directory; copy them to `.env`
locally. Real secrets are **never** committed.

## Production deployment

Production is automated via GitHub Actions (`.github/workflows/deploy.yml`):
every push to `main` lints, typechecks, builds, then deploys the backend and
frontend to Cloud Run in `us-east2`.

### Required GitHub secrets

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID. |
| `WIF_PROVIDER` | Workload Identity Federation provider resource name. |
| `WIF_SERVICE_ACCOUNT` | Service account email to impersonate from CI. |
| `ARTIFACT_REGISTRY` | Artifact Registry repository name. |

### Required GCP setup (one-time)

1. Enable APIs: `run`, `cloudbuild`, `artifactregistry`, `secretmanager`.
2. Create an Artifact Registry repo (`$ARTIFACT_REGISTRY`) in `us-east2`.
3. Create a Workload Identity Federation pool + provider for GitHub Actions
   and bind it to a service account with these roles:
   - `roles/run.admin`
   - `roles/cloudbuild.builds.editor`
   - `roles/artifactregistry.writer`
   - `roles/secretmanager.secretAccessor`
   - `roles/iam.serviceAccountUser` (on the Cloud Run runtime SA)
4. Create the two application secrets (see [GCP_SUPABASE.md](./docs/GCP_SUPABASE.md)):
   - `ajaia-supabase-db-url` — Supabase connection string
   - `ajaia-backend-frontend-url` — Cloud Run frontend URL (for CORS)
5. Create the Supabase project, grant the role the minimum needed privileges,
   and put its connection string in the secret above.

### What CI does

1. `pnpm install --frozen-lockfile` (fails if the lockfile is out of date)
2. `pnpm turbo lint typecheck build`
3. Authenticate to GCP via Workload Identity Federation.
4. Build the backend image and push to Artifact Registry.
5. Deploy the backend to Cloud Run, injecting `DATABASE_URL` and
   `FRONTEND_URL` from Secret Manager.
6. Run `prisma migrate deploy` against Supabase, fetching the connection
   string from `ajaia-supabase-db-url` in Secret Manager.
7. Build the frontend image and deploy to Cloud Run, with `BACKEND_URL`
   set to the URL of the newly-deployed backend service.

## Risk notes

- **Plate.js major versions**: Plate and its peer packages move fast. We pin
  them in `apps/frontend/package.json`; upgrade intentionally and run the
  full Phase D manual test before merging.
- **Slate list/heading edge cases**: validate bullet/ordered list + heading
  interactions locally before shipping a Plate upgrade.
- **Supabase role permissions**: migrations need `USAGE` and `CREATE` on the
  `public` schema. See `docs/GCP_SUPABASE.md`.

## See also

- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — the
  planning document this repo was scaffolded from.
- [`docs/GCP_SUPABASE.md`](./docs/GCP_SUPABASE.md) — env-var contract and
  the manual one-time setup steps for GCP + Supabase.
