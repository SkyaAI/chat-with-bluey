import { createClient } from "@/lib/supabase/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("A secure Bluey session is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireAuthenticatedUser() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new AuthenticationRequiredError();
  return { db, user: data.user };
}

export async function currentUserId() {
  try {
    const { user } = await requireAuthenticatedUser();
    return user.id;
  } catch {
    return null;
  }
}
