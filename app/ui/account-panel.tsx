"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AccountPanel() {
  const client = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    client.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const isGuest = Boolean(user?.is_anonymous);

  return (
    <section className="mx-auto mt-4 max-w-xl rounded-3xl border-2 border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="text-3xl font-black">Your Bluey account</h2>
      {isGuest ? (
        <div className="mt-5">
          <p className="rounded-2xl bg-blue-50 p-4 font-bold">You are using Bluey as a secure guest.</p>
          <p className="mt-3">Your chats belong only to this browser session. Permanent sign-in will be enabled in a later approved stage.</p>
        </div>
      ) : user ? (
        <div className="mt-5">
          <p className="rounded-2xl bg-emerald-50 p-4 font-bold">Signed in as {user.email ?? "your Bluey account"}</p>
          <p className="mt-3">Your chats remain attached to this account.</p>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-amber-50 p-4 font-bold">Bluey is preparing your secure guest session.</p>
      )}
    </section>
  );
}
