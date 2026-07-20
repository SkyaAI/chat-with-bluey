import { createClient } from "@/lib/supabase/server";

export async function currentUserId() {
  try { const client = await createClient(); const { data } = await client.auth.getUser(); return data.user?.id ?? null; }
  catch { return null; }
}
