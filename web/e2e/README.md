# Playwright e2e tests

## Layout

```
e2e/
├── public/        # Tests that don't require auth — only the frontend
│   └── login-renders.spec.ts
└── authed/        # Tests that need a logged-in session (NOT IMPLEMENTED YET)
```

## Running locally

The frontend dev server must already be running at `http://127.0.0.1:3000`. Tests in `public/` don't need the backend; tests in `authed/` need both backend (`:8001`) and a Supabase project with seeded test users.

```bash
# Terminal 1
cd backend && uvicorn main:app --port 8001
# Terminal 2
cd web && npm run dev
# Terminal 3
cd web && npm run test:e2e
```

`npm run test:e2e` shells out to `playwright test`. Pass any of [Playwright's CLI flags](https://playwright.dev/docs/test-cli) through, e.g. `npm run test:e2e -- --headed` for an interactive run.

## What's covered today (public/)

| Test | What it proves |
|---|---|
| `login-renders.spec.ts` › renders the email + password fields | The build is wired correctly, the proxy isn't redirecting `/login` away, the form mounts |
| `login-renders.spec.ts` › submitting empty form does not crash | The submit handler doesn't throw on the no-input case |

## What's NOT covered yet (authed/) — and why

The high-value flows (조직도 다이얼로그 staging, 통계 필터, 사이트 CRUD) all require an authenticated session, and authentication goes through Supabase. Setting that up safely is a separate piece of work because:

1. **Don't authenticate against production Supabase.** A test user that gets approved would pollute the real `user_profile` table.
2. **Test fixtures need to seed/clean data.** Each test that creates a site needs to delete it afterwards, otherwise tests start interfering with each other.
3. **Storage uploads (org photos, site images) leave artifacts** in the Supabase Storage bucket unless explicitly cleaned.

### Recommended path forward

Rough sketch — treat as next-session work, not blocking:

1. **Spin up a separate Supabase project for testing** (Pro tier supports this; free tier can use a separate project with a dummy email domain).
2. **Pre-seed a test user in that project** with `status=approved` and `role=admin`.
3. **Use Playwright's [global setup](https://playwright.dev/docs/test-global-setup-teardown)** to log that user in once and save the storage state to `e2e/.auth/admin.json`. Reuse that state in `authed/` tests via `test.use({ storageState: ... })`.
4. **Each `authed/` test that mutates data** should clean up in `test.afterEach` (delete the site it created, etc.) so suites can run in any order.

Five flows worth covering once auth is wired up, in priority order:

1. `/statistics` loads, filter changes update charts (catches the most common regression — broken summary endpoint or filter wiring).
2. Open org-chart dialog → add a member → save → reopen and verify it persisted (covers the staging logic from `useMemberStaging`).
3. Open org-chart dialog → add member → cancel → verify nothing changed (the cancel-doesn't-leak case).
4. Site form: edit a site, change office_address, save, verify dashboard reflects new coords (covers the Kakao geocode pipeline).
5. Admin user approval: pending user → admin approves → user can access /statistics.

## CI

Today CI runs typecheck + lint + build only. To add Playwright to CI:

1. Add a `playwright` job to `.github/workflows/ci.yml` that:
   - installs deps,
   - runs the frontend (`npm run start` after `npm run build`),
   - executes `npx playwright test`.
2. For `authed/` tests, that job also needs the backend running and access to the test Supabase secrets — best added once auth fixtures are in place.
