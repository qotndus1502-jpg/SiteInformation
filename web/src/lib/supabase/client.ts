"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Singleton Supabase browser client.
 *
 *  Multiple `createBrowserClient` instances in the same tab race for the
 *  shared cookie storage when refreshing tokens, which can deadlock
 *  `getSession()` and hang any `authFetch` indefinitely (saves stuck on
 *  "저장 중…", with no PUT ever reaching the backend). Reusing one
 *  instance — shared between AuthProvider and authFetch — eliminates the
 *  refresh-lock contention.
 *
 *  Stored on `globalThis` so Next.js dev Fast Refresh re-executing this
 *  module does NOT reset the variable. Without this, AuthProvider keeps
 *  the pre-HMR client (its useMemo deps are []) while later authFetch
 *  calls get a freshly created one — recreating the exact race the
 *  singleton was meant to prevent. */
const SINGLETON_KEY = "__supabase_browser_client__";

type WithCache = typeof globalThis & { [SINGLETON_KEY]?: SupabaseClient };

export function createClient(): SupabaseClient {
  const g = globalThis as WithCache;
  if (g[SINGLETON_KEY]) return g[SINGLETON_KEY]!;
  g[SINGLETON_KEY] = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return g[SINGLETON_KEY]!;
}
