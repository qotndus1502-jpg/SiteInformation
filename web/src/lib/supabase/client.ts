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
 *  refresh-lock contention. */
let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
