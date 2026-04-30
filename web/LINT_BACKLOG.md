# Lint backlog

Remaining lint issues that the CI surfaces but does not block on. As of
`12 errors / 55 warnings` after the Phase 5 cleanup pass.

## React 19 strict-mode violations (treat as bugs, fix in dedicated PR)

These are not style issues — they're real cross-render hazards that React 19's
new lint rules now flag. Each requires moving setState out of an effect (into
an event handler or an action), or restructuring the ref usage. Don't bulk-fix
without manual verification of behaviour.

### `Calling setState synchronously within an effect can trigger cascading renders`

| File | Line |
|---|---|
| `src/components/dashboard/_internal/useOrgChartData.ts` | 62:21 |
| `src/components/dashboard/employee-profile.tsx` | 96:21 |
| `src/components/dashboard/site-image.tsx` | 127:5 |
| `src/components/layout/demo-notice.tsx` | 12:5 |
| `src/components/statistics/_internal/SiteListWithDetail.tsx` | 48:19 |
| (one more in dialog/sites code — see `npm run lint`) | |

Pattern: `useEffect(() => { setX(...) }, [deps])`. The fix usually is one of:

1. Compute the derived value during render instead of caching in state.
2. Move the setState into the event/handler that actually triggered the change.
3. Switch to `useSyncExternalStore` if it's external-state mirroring.

### `Cannot access refs during render`

`src/components/dashboard/site-map.tsx:337–340` — the SiteMap component reads
multiple refs (`onSelectRef.current = onSelect` etc.) at the top of the
function body. Move those assignments into a `useEffect`.

### `Compilation Skipped: Existing memoization could not be preserved`

`src/components/statistics/statistics-client.tsx:202` — the React 19 compiler
gives up on a `useCallback` because the surrounding code mixes state and
closure dependencies in a way it can't analyze. Either inline the callback
or simplify the closure.

## Other errors

- ~~`@next/next/no-sync-scripts`~~ — fixed: `app/layout.tsx` now uses
  `next/script` with `strategy="beforeInteractive"` for the Kakao Maps SDK.

## Warnings (55) — lower priority

Mostly:
- `@typescript-eslint/no-unused-vars` — drop the unused names.
- `react-hooks/exhaustive-deps` — review each: many are intentional (silenced
  with `// eslint-disable-next-line`) and some are real missed deps.
- `@next/next/no-img-element` — replace with `next/image` where it's a
  performance win (mostly the org-photo `<img>` tags).

## Working through this list

CI runs `npm run lint` with `continue-on-error: true` so the report stays
visible without blocking merges. Once the React 19 violations are cleaned up:

1. Drop `continue-on-error` from `.github/workflows/ci.yml`.
2. (Optional) Add `--max-warnings 0` to the `npm run lint` step to enforce
   zero warnings going forward.
