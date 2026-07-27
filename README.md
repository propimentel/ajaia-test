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
│  │  └─ prisma/
│  │     ├─ schema.prisma           # Document model + userId (source of truth)
│  │     └─ migrations/             # committed; applied via prisma migrate deploy
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

The repo ships a `pnpm-lock.yaml` and the initial Prisma migration, so a
fresh clone only needs install + env + database bootstrap:

```bash
# 1. Install dependencies (uses the committed lockfile)
pnpm install

# 2. Copy env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env   # optional — the dev default works

# 3. Start Postgres
pnpm db:up

# 4. Apply the committed migration
pnpm db:deploy
```

Subsequent dev sessions only need `pnpm db:up && pnpm dev`.

### Quickstart (day-to-day)

```bash
# 1. Start Postgres (if not already running)
pnpm db:up

# 2. Make sure the local .env exists (only needed once per clone)
cp apps/backend/.env.example apps/backend/.env

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
| `pnpm db:migrate` | Runs `prisma migrate dev` (apply + create new migrations). |
| `pnpm db:deploy` | Runs `prisma migrate deploy` (apply committed migrations — used in CI and after a fresh clone). |
| `pnpm db:studio` | Opens Prisma Studio. |
| `pnpm db:generate` | Regenerates the Prisma client. |
| `pnpm format` | Runs Prettier in write mode. |
| `pnpm format:check` | Runs Prettier in check mode (CI-friendly). |

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

Every `/documents` request must include the `X-User-Id` header (a UUID). The
backend returns `400 Bad Request` if the header is missing or not a valid
UUID, and `404 Not Found` for documents that exist but belong to a different
user (no enumeration via 403/404 distinction).

The exact request/response types live in [`packages/shared`](./packages/shared).

## Anonymous users

Visitors do not need to log in. On first visit the frontend generates a
random UUID and stores it in `localStorage` under `ajaia:anonUserId`. The
frontend then sends it on every API request via the `X-User-Id` header,
and the backend uses it to scope all document reads/writes to that user.

The anonymous UUID is **stable for the lifetime of the browser storage**:
clearing site data (or using a different browser/device) produces a new
identity and a fresh document set.

### Future: linking an anonymous user to a real account

The header-based design is intentional. When real auth is added, the
controller's source of the user id will switch from the `X-User-Id` header
to `req.user.id` decoded from a JWT — the service code (and the schema's
`Document.userId` column) stay the same. To upgrade an anonymous session
in place, the new auth flow can:

1. Read `ajaia:anonUserId` from `localStorage` (if present) before login.
2. POST it to an `/auth/migrate` endpoint along with the new credentials
   or signup payload; the server reassigns any documents owned by that
   UUID to the newly-created real user.
3. Remove the localStorage key on success.

## Environment variables

| Name | Used by | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | backend | yes | — | Postgres connection string. |
| `PORT` | backend | no | `3001` (local) / `8080` (container) | HTTP port. |
| `FRONTEND_URL` | backend | no | `http://localhost:5173` | CORS allow-list origin. |
| `VITE_API_URL` | frontend (dev) | no | `http://localhost:3001` | API base URL the dev server talks to. |
| `VITE_API_URL` | frontend (build) | no | `/api` | API base URL baked into the prod bundle; resolved at container startup through nginx. |
| `BACKEND_URL` | frontend container | no | `http://localhost:3001` | Runtime env var used by nginx to proxy `/api/*` and `/health`. |

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

- **Plate.js v53**: the editor is on `platejs@^53.0.0` with the v53 plugin
  and toolbar API. Plate and its peer packages move fast; the version
  range in `apps/frontend/package.json` is pinned intentionally. When
  bumping, exercise create / edit / autosave / doc-switch / list / heading
  interactions before shipping.
- **Slate is transitive**: the editor does not import `slate`, `slate-react`
  or `slate-history` directly. Don't re-add them as direct dependencies
  without checking what v53 exposes from `platejs`.
- **Supabase role permissions**: migrations need `USAGE` and `CREATE` on the
  `public` schema. See `docs/GCP_SUPABASE.md`.
- **Anonymous identity is per-browser**: clearing site data, switching
  browser, or using a private window produces a new UUID and a fresh
  document set. The same UUID in two tabs/devices sees the same docs;
  two different UUIDs do not.

## See also

- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — the
  planning document this repo was scaffolded from.
- [`docs/GCP_SUPABASE.md`](./docs/GCP_SUPABASE.md) — env-var contract and
  the manual one-time setup steps for GCP + Supabase.
