# Implementation Plan: Ajaia — Document Editor Full Stack App

> Status: **Draft — to be implemented in a next phase.**
> Created from a brainstorming/planning session; see the bottom of this file for the
> decisions captured before writing.

---

## 1. Overview

Turborepo monorepo with a Vite + React + Shadcn + Tailwind frontend embedding **Plate.js**
as the rich-text/markdown editor, and a **Nest.js** backend exposing a REST API over
**Prisma** → Postgres (Docker locally, Supabase in prod).

Two Cloud Run services (frontend + backend), secrets via GCP Secret Manager, CI/CD via
GitHub Actions to `us-east2`.

Starting point: empty directory at `/home/propimentel/code/ajaia`.
Package manager: **pnpm** (Turborepo + monorepo best practice).

---

## 2. Monorepo Structure

```
ajaia/
├─ apps/
│  ├─ backend/                # Nest.js
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ prisma/           # PrismaModule + service
│  │  │  └─ documents/        # DocumentsModule (CRUD)
│  │  ├─ prisma/schema.prisma
│  │  ├─ Dockerfile
│  │  └─ tsconfig.json
│  └─ frontend/               # Vite + React + TS
│     ├─ src/
│     │  ├─ main.tsx
│     │  ├─ App.tsx
│     │  ├─ components/
│     │  │  ├─ editor/        # Plate.js editor + toolbar
│     │  │  └─ ui/            # shadcn components
│     │  ├─ pages/            # DocumentList, DocumentEdit
│     │  ├─ lib/              # api client, utils
│     │  └─ api/              # generated/typed fetch wrappers
│     ├─ components.json       # shadcn config
│     ├─ tailwind.config.ts
│     ├─ vite.config.ts
│     └─ Dockerfile
├─ packages/
│  └─ shared/                 # TS types (Document DTOs) shared by both apps
│     └─ src/index.ts
├─ docker-compose.yml         # local Postgres + (optional) backend
├─ .github/workflows/deploy.yml
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

---

## 3. Phase-by-phase tasks

### Phase A — Scaffolding (Turborepo + pnpm)
1. `pnpm init`, `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
2. `turbo.json` with pipelines: `build`, `dev`, `lint`, `typecheck`, `test`.
   Define task deps so `frontend` build depends on `shared` build (and similar for backend).
3. Root `package.json` devDeps: `turbo`, `typescript`, `prettier`, `eslint`.
4. `tsconfig.base.json` with strict TS + path mapping for `@ajaia/shared`.
5. `pnpm install`.

### Phase B — `packages/shared`
- Export `DocumentDto`, `CreateDocumentDto`, `UpdateDocumentDto`, `DocumentMeta`
  (id, title, content, createdAt, updatedAt).
- Build with `tsup` to `dist/` (consumed via package path, not TS source).

### Phase C — Backend (Nest.js)
1. Scaffold `apps/backend` via `@nestjs/cli`, wire to the monorepo.
2. Install `@nestjs/common/platform-express`, `@prisma/client`, `prisma` (dev),
   `class-validator`, `class-transformer`, `@nestjs/config`.
3. `prisma/schema.prisma`:

   ```prisma
   model Document {
     id        String   @id @default(uuid())
     title     String   @default("Untitled")
     content   String   @default("")   // markdown string
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

4. `PrismaModule` (global, exports `PrismaService` wrapping `@prisma/client`).
   `DATABASE_URL` injected from env.
5. `DocumentsModule` with controller `/documents`:
   - `GET    /documents` → list meta (id, title, updatedAt)
   - `GET    /documents/:id` → full doc
   - `POST   /documents` → create (optional title)
   - `PATCH  /documents/:id` → rename / update content
   - `DELETE /documents/:id`
6. Enable CORS for the frontend origin (`ConfigService`-driven, env: `FRONTEND_URL`).
7. ValidationPipe + global exception filter.
8. Health check at `GET /health`.

### Phase D — Frontend (Vite + React + Shadcn + Tailwind)
1. Scaffold Vite React-TS app into `apps/frontend`; add `vite`/`@vitejs/plugin-react`/
   `react`/`react-dom`/`react-router-dom`.
2. Tailwind v3 config + `postcss`, `src/index.css` with Tailwind directives.
3. `components.json` for shadcn → components install (`button`, `input`, `dialog`,
   `dropdown-menu`, `tooltip`, `sonner`, `card`, `separator`, `toolbar` via shadcn registry).
4. Plate.js setup (per their official Vite guide):
   - `pnpm add @platejs/slate @platejs/slate-react slate slate-react @platejs/markdown`
   - Install Plate UI kit via `pnpm dlx shadcn@latest add @plate/plate-ui`
   - Set up `MarkdownPlugin` from `@platejs/markdown` for serialize/deserialize.
5. Editor component (`components/editor/document-editor.tsx`):
   - `FixedToolbar` with: B, I, U, H1, H2, Bullet list, Numbered list.
   - Auto-save: debounce (1.5s) → `PATCH /documents/:id` with current markdown via
     `editor.api.markdown.serialize()`.
   - Title input above the editor that renames via debounced `PATCH`.
6. Pages:
   - `DocumentsPage` — list with create button, open, rename (inline), delete (dropdown menu).
   - `DocumentEditPage` — loads doc by `:id`, mounts `DocumentEditor`, stores autosave
     state + last-saved indicator (sonner toast).
7. API client (`lib/api.ts`): typed fetch wrappers using `@ajaia/shared` DTOs;
   `VITE_API_URL` env var. Handle 404/409 succinctly.

### Phase E — Local dev
1. `docker-compose.yml` at repo root:

   ```yaml
   services:
     postgres:
       image: postgres:16
       environment: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: ajaia }
       ports: ["5432:5432"]
       volumes: ["pgdata:/var/lib/postgresql/data"]
   volumes: { pgdata: {} }
   ```

2. `.env.example`:

   ```
   # backend
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ajaia
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   # frontend
   VITE_API_URL=http://localhost:3001
   ```

3. Leaf scripts in root `package.json`: `dev` (turbo run dev, parallel),
   `db:migrate` (`pnpm --filter backend prisma migrate dev`), `db:up` (`docker compose up -d postgres`).
4. `pnpm db:up && pnpm db:migrate && pnpm dev` → backend on :3001, frontend on :5173.

### Phase F — Dockerization
1. `apps/backend/Dockerfile` — multi-stage node:20-slim, runs `prisma generate`,
   builds, `CMD node dist/main.js`. Exposes 8080.
2. `apps/frontend/Dockerfile` — multi-stage: build with `VITE_API_URL` build-arg,
   then serve `dist/` via `nginx:alpine` (`nginx.conf` proxies `/api/*` → backend URL
   via runtime envsubst, so the same image works in different envs).
3. Each app gets `.dockerignore`.

### Phase G — GCP Secret Manager + Supabase wiring
1. Create Secret Manager secrets (manual one-time, documented in README):
   - `ajaia-supabase-db-url` — Supabase Postgres connection string
   - `ajaia-backend-frontend-url` — Cloud Run frontend URL (for CORS allow-list)
2. Cloud Run services mount secrets as env vars via `--set-secrets`.
3. Backend reads `DATABASE_URL` from secret; no `.env` in prod.
   Same code path as local — Prisma just needs a valid `DATABASE_URL`.
4. Supabase: create project, get connection string (pooler or direct), grant necessary
   privileges to the role; no schema work needed beyond Prisma migrations.
   Run `prisma migrate deploy` in the backend Cloud Run instance via a startup step or
   a Cloud Build job.

### Phase H — CI/CD (GitHub Actions → Cloud Run `us-east2`)
1. `.github/workflows/deploy.yml`, triggers on push to `main`.
2. Job matrix / steps:
   - Checkout, setup Node 20, setup pnpm.
   - `pnpm install --frozen-lockfile`.
   - `pnpm turbo lint typecheck`
   - `pnpm turbo build` (builds both apps).
   - Auth to GCP via `google-github-actions/auth` using `WIF_PROVIDER` +
     `WIF_SERVICE_ACCOUNT` secrets (Workload Identity Federation, no long-lived keys).
   - Build & push **backend** image to Artifact Registry (`us-east2-docker.pkg.dev/...`),
     `gcloud builds submit` then
     `gcloud run deploy ajaia-backend --region=us-east2 --image=... --set-secrets=DATABASE_URL=ajaia-supabase-db-url:latest,FRONTEND_URL=ajaia-backend-frontend-url:latest --no-allow-unauthenticated` (internal).
   - Build & push **frontend** image;
     `gcloud run deploy ajaia-frontend --region=us-east2 --image=... --allow-unauthenticated --set-env-vars=VITE_API_URL=<backend-url-output>` —
     uses the backend's deployed URL (frontend's nginx proxies `/api/*` to it).
   - Run `prisma migrate deploy` against Supabase using the secret (step in the deploy
     job, granted the secret via Workload Identity).
3. Required GitHub secrets (set once): `GCP_PROJECT_ID`, `WIF_PROVIDER`,
   `WIF_SERVICE_ACCOUNT`, `ARTIFACT_REGISTRY`.
   Supabase URL lives **only** in Secret Manager, not GitHub Actions.

### Phase I — Docs & polish
1. `README.md`: architecture diagram (text), local dev quickstart, prod deploy overview,
   env var table, secret creation steps, IAM roles required (Workload Identity principal
   gets roles/secretmanager.secretAccessor + roles/run.admin + roles/cloudbuild.builds.editor
   on project).
2. `.env.example` committed; no real secrets committed.

---

## 4. Key technical decisions

- **Editor:** Plate.js with `MarkdownPlugin`. Auto-save serializes to markdown and PATCHes;
  reopening deserializes markdown back into Plate state — fully round-trips the required
  formatting (bold/italic/underline/headings/lists; underline serializes to `<u>` MDX which
  Plate handles out of the box).
- **Backend:** Nest.js (≡ Express under the hood) with single REST resource `documents`.
  Clean module boundaries (Prisma / Documents).
- **ORM:** Prisma, switched purely by changing `DATABASE_URL` between Docker Postgres and
  Supabase; migrations via `prisma migrate deploy` in CI.
- **Storage:** Markdown `text` column — simple, portable, human-readable in the DB.
- **No auth:** global document table; can be added later behind a `userId` column +
  Supabase Auth/RLS without schema upheaval.
- **Two Cloud Run services:** scales and isolates independently; nginx in frontend image
  proxies `/api/*` to the backend so the frontend bundle doesn't bake in the backend URL.

---

## 5. Risk / open items

- **Plate.js major-version churn** — pin Plate and its companion packages to a known
  compatible major; don't blindly upgrade mid-build.
- **Slate nested-list edge cases** — validate list + heading interactions early in
  Phase D; this is the most likely place to hit Slate quirks.
- **Supabase `prisma migrate deploy` permissions** — Supabase's default role may need
  `GRANT` of `USAGE` on the `public` schema and `CREATE` if migrations create types.
  Will add to README; the plan covers this in Phase G.
- **Cloud Build vs Cloud Run Jobs for migrations** — choosing to run migrations as a
  deploy step (with the secret attached) keeps the pipeline simple. Verify in Phase H.

---

## 6. Decisions captured during planning (Q&A)

| Question | Decision |
|---|---|
| Editor library | **Plate.js** — native shadcn registry, free bidirectional markdown via `@platejs/markdown`, Vite officially supported, all required features built-in. Alternatives considered: TipTap, Lexical, Novel, Editor.js. |
| Backend framework | **Nest.js** (NOT Next.js) — REST API on Express. |
| API style | REST API routes — simple CRUD over `/documents`. |
| ORM / data layer | **Prisma** — type-safe, easy swap of `DATABASE_URL` between Docker Postgres and Supabase. |
| Auth | **No auth — single-user** for MVP; documents are global. Add auth/RLS later. |
| Document storage format in DB | **Markdown string** (`text` column). Serialize/deserialize via `@platejs/markdown` on the client. |
| Cloud Run topology | **Two services** (frontend served as container via nginx; backend as a separate Cloud Run service). |
| Package manager | **pnpm** with Turborepo workspaces. |
| Deployment region | Cloud Run **`us-east2`**. |
| Secrets | **GCP Secret Manager** for Supabase connection string + any other secrets. GitHub Actions accesses them via Workload Identity Federation (no long-lived keys). |
| CI runner | GitHub Actions on `ubuntu-latest`, Node 20. |
