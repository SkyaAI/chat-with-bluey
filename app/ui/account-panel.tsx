"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AccountPanel() {
  const client = useMemo(() => createClient(), []); const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { client.auth.getUser().then(({ data }) => setUser(data.user)); const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null)); return () => data.subscription.unsubscribe(); }, [client]);
  async function signIn(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setMessage(error ? error.message : "Check your email for Bluey’s secure sign-in link."); setBusy(false); }
  async function signOut() { setBusy(true); await client.auth.signOut(); setUser(null); setBusy(false); }
  return <section className="mx-auto mt-4 max-w-xl rounded-3xl border-2 border-blue-100 bg-white p-6 shadow-sm"><h2 className="text-3xl font-black">Your Bluey account</h2>{user ? <div className="mt-5"><p className="rounded-2xl bg-emerald-50 p-4 font-bold">Signed in as {user.email}</p><p className="mt-3">New chats and reminders are attached to your account.</p><button disabled={busy} onClick={() => void signOut()} className="focus-ring mt-5 min-h-14 w-full rounded-2xl border-2 border-red-200 font-bold text-red-700">Sign out</button></div> : <form onSubmit={signIn} className="mt-5"><p>Sign in with a secure email link. You can keep using the guest demo without signing in.</p><label className="mt-4 block font-bold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring mt-1 min-h-14 w-full rounded-xl border-2 border-slate-300 px-4" placeholder="you@example.com"/></label><button disabled={busy} className="focus-ring mt-5 min-h-14 w-full rounded-2xl bg-[#175cd3] font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Email me a sign-in link"}</button></form>}{message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 font-bold">{message}</p>}</section>;
}
