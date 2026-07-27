# GCP & Supabase — env-var contract

The backend reads the same env vars in local, containerized, and Cloud Run
environments. The only thing that changes between environments is where the
values come from (local `.env` file vs. Secret Manager).

## Env vars the backend reads

| Name | Required | Source (local) | Source (prod) | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | yes | `apps/backend/.env` | Secret Manager: `ajaia-supabase-db-url` | Postgres connection string. Direct or Supabase pooler. |
| `PORT` | no (default `3001` local, `8080` in container) | `.env` | Cloud Run injects `PORT` automatically | Port the HTTP server binds to. |
| `FRONTEND_URL` | yes | `.env` | Secret Manager: `ajaia-backend-frontend-url` | Exact Cloud Run frontend URL — used for CORS allow-list. |

## Env vars the frontend reads

| Name | Source | Notes |
|---|---|---|
| `VITE_API_URL` | `.env` (local) / build-arg (Docker) | Baked at build time. Use `http://localhost:3001` locally; use `/api` in container so nginx can proxy. |
| `BACKEND_URL` | Cloud Run env var | Set at deploy time. Used by nginx to proxy `/api/*`. |

## GCP Secret Manager secrets to create (manual, one-time)

```bash
gcloud secrets create ajaia-supabase-db-url --replication-policy=automatic
gcloud secrets create ajaia-backend-frontend-url --replication-policy=automatic
```

Then grant `roles/secretmanager.secretAccessor` on each to the Workload
Identity principal used by GitHub Actions.

## Supabase setup (manual, one-time)

1. Create the project at <https://supabase.com>.
2. From the project's **Settings → Database**, copy the connection string
   (use the **direct** connection for migrations, the **pooler** URL for
   runtime if you expect to scale to many connections).
3. Grant the migration role the minimum it needs:
   ```sql
   GRANT USAGE ON SCHEMA public TO <role>;
   GRANT CREATE ON SCHEMA public TO <role>;
   ```
4. Add the role's connection string to Secret Manager
   (`ajaia-supabase-db-url`).
5. Migrations are applied by the CI pipeline (see `.github/workflows/deploy.yml`).
