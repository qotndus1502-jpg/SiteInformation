# Frontend types

Two layers:

## `database.ts`, `org-chart.ts`
Hand-written types for Supabase view rows that the backend never reshapes. Edited by humans; keep in sync with the SQL views in `db/migrations/`.

## `api-generated.ts` *(auto-generated)*
Path / method / query-parameter types pulled from the FastAPI `/openapi.json` endpoint. **Do not edit by hand** — re-run codegen instead.

### Re-generating

The backend dev server must be running at `http://127.0.0.1:8001`:

```bash
cd backend
uvicorn main:app --port 8001 &

cd ../web
npm run gen:api
```

This overwrites `src/types/api-generated.ts`. Commit the regenerated file.

### Current limitations

The backend declares only 4 Pydantic schemas, so most response bodies generate as `Record<string, never>` instead of typed objects. Path/method/query-string validation works (catches URL typos), but response-body type-safety is partial.

To get full type safety on a given endpoint, add a `response_model=...` to its FastAPI decorator. Highest-value targets, in order:

1. `/api/statistics/summary` — already has a hand-written `StatisticsSummary` type in `lib/api/statistics.ts`. Adding `response_model=StatisticsSummary` (Pydantic equivalent) on the backend would make the two converge.
2. `/api/sites` (GET) — currently typed as `SiteDashboard[]` from a Supabase view; backend should formalize the response model.
3. `/api/users` — admin user list. Drift between `UserProfile` in `lib/api/users.ts` and the backend's `user_profile` table caused subtle bugs in the past.

### Why the manual types stay
While most endpoints lack `response_model`, `lib/api/*.ts` keeps hand-written response interfaces so callers don't have to guard every field. Once an endpoint gets a backend `response_model`, swap the manual interface for the generated one — the change is mechanical.
