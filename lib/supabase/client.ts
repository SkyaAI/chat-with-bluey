import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function ensureAnonymousUser(client: SupabaseClient): Promise<User> {
  const current = await client.auth.getUser();
  if (current.data.user) return current.data.user;

  const created = await client.auth.signInAnonymously();
  if (created.error || !created.data.user) {
    throw new Error("Bluey could not start a secure guest session. Please refresh and try again.");
  }
  return created.data.user;
}
