"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import RemindersPanel from "@/app/ui/reminders-panel";
import GamesPanel from "@/app/ui/games-panel";
import AccountPanel from "@/app/ui/account-panel";
import { createClient, ensureAnonymousUser } from "@/lib/supabase/client";

type Conversation = { id: string; title: string; created_at: string };
type Message = { id: string; conversation_id: string; role: "user" | "assistant"; content: string; input_mode: string; created_at: string };

function sessionKey() {
  const existing = localStorage.getItem("bluey-session-key");
  if (existing) return existing;
  const created = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem("bluey-session-key", created);
  return created;
}

export default function BlueyApp() {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [view, setView] = useState<"chat" | "reminders" | "games" | "account">("chat");
  const [subscribed, setSubscribed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice" | "image">("text");
  const [imageData, setImageData] = useState<string | undefined>();

  const load = useCallback(async (conversationId?: string | null) => {
    setLoading(true); setError("");
    try {
      const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
      const response = await fetch(`/api/chat${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConversations(data.conversations); setMessages(data.messages); setUsed(data.used); setSubscribed(data.subscribed);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bluey can’t connect right now. Try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    async function startSecureGuestSession() {
      try {
        await ensureAnonymousUser(supabase);
        if (active) await load(null);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Bluey could not start a secure guest session.");
          setLoading(false);
        }
      }
    }
    void startSecureGuestSession();
    return () => { active = false; };
  }, [load, supabase]);
  const selectedConversation = useMemo(() => conversations.find((item) => item.id === selected), [conversations, selected]);

  async function choose(id: string) { setSelected(id); await load(id); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!input.trim() || sending) return;
    const content = input.trim(); setInput(""); setSending(true); setError("");
    setMessages((current) => [...current, { id: `temp-${Date.now()}`, conversation_id: selected ?? "", role: "user", content, input_mode: "text", created_at: new Date().toISOString() }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected, content, inputMode, imageData }) });
      const data = await response.json();
      if (response.status === 402) { setPaywall(true); setUsed(data.used); return; }
      if (!response.ok) throw new Error(data.error);
      setSelected(data.conversationId); setUsed(data.used); setInputMode("text"); setImageData(undefined); await load(data.conversationId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bluey can’t connect right now. Try again."); }
    finally { setSending(false); }
  }

  async function checkout() {
    setCheckoutBusy(true); setError("");
    try { const response = await fetch("/api/checkout", { method: "POST", headers: { "x-session-key": sessionKey() } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!data.url) throw new Error("Checkout did not return a link."); window.location.assign(data.url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Checkout could not start."); setPaywall(false); }
    finally { setCheckoutBusy(false); }
  }

  function listen() {
    type ResultEvent = { results: { 0: { 0: { transcript: string } } } };
    type Recognition = { lang: string; interimResults: boolean; onresult: (event: ResultEvent) => void; onerror: () => void; start: () => void };
    const SpeechRecognition = (window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice input is not supported in this browser. You can still type your question."); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "en-AU"; recognition.interimResults = false;
    recognition.onresult = (event) => { setInput(event.results[0][0].transcript); setInputMode("voice"); };
    recognition.onerror = () => setError("Bluey couldn’t hear that. Please try again or type your question."); recognition.start();
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2_500_000) { setError("Choose a PNG, JPG, or WebP photo smaller than 2.5 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { setImageData(String(reader.result)); setInputMode("image"); if (!input.trim()) setInput("What meal can I make from the ingredients in this photo?"); }; reader.readAsDataURL(file);
  }

  return <main className="min-h-screen bg-[#fffaf0]">
    <header className="bg-[#175cd3] px-4 py-4 text-white shadow-md"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Chat with Bluey</h1><p className="text-base text-blue-100">Your friendly everyday helper</p></div><div className="rounded-2xl bg-white/15 px-4 py-2 text-center"><strong className="text-xl">{subscribed ? "∞" : Math.max(0, 5-used)}</strong><span className="block text-sm">{subscribed ? "unlimited questions" : "free questions left"}</span></div></div><nav className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-2" aria-label="Main navigation"><button onClick={() => setView("chat")} className={`focus-ring min-h-12 rounded-xl px-4 font-bold ${view === "chat" ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>Chat</button><button onClick={() => setView("reminders")} className={`focus-ring min-h-12 rounded-xl px-4 font-bold ${view === "reminders" ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>Reminders</button><button onClick={() => setView("games")} className={`focus-ring min-h-12 rounded-xl px-4 font-bold ${view === "games" ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>Games</button><button onClick={() => setView("account")} className={`focus-ring min-h-12 rounded-xl px-4 font-bold ${view === "account" ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>Account</button></nav></header>
    {view === "reminders" ? <RemindersPanel sessionKey={sessionKey} /> : view === "games" ? <GamesPanel sessionKey={sessionKey} /> : view === "account" ? <AccountPanel /> : <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[320px_1fr]">
      <aside className="rounded-3xl border-2 border-blue-100 bg-white p-4 shadow-sm"><button className="focus-ring mb-4 min-h-14 w-full rounded-2xl bg-[#102a56] px-5 py-3 font-bold text-white" onClick={() => { setSelected(null); setMessages([]); }}>+ New chat</button><h2 className="mb-3 text-xl font-bold">Your chats</h2>{loading && !conversations.length ? <p>Loading your chats…</p> : conversations.map((item) => <button key={item.id} onClick={() => void choose(item.id)} className={`focus-ring mb-2 min-h-16 w-full rounded-2xl border-2 px-4 py-3 text-left font-semibold ${selected === item.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}>{item.title}</button>)}{!loading && !conversations.length && <p>Start your first chat with Bluey.</p>}</aside>
      <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border-2 border-blue-100 bg-white shadow-sm"><div className="border-b-2 border-blue-100 p-5"><h2 className="text-2xl font-bold">{selectedConversation?.title ?? "What can Bluey help with?"}</h2></div><div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">{!messages.length && !loading && <div className="mx-auto mt-12 max-w-lg rounded-3xl bg-blue-50 p-6 text-center"><div className="mb-3 text-5xl">🐶</div><h3 className="text-2xl font-bold">Start your first chat with Bluey</h3><p className="mt-2">Ask what to cook, plan a gentle activity, or get help with your day.</p></div>}{messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-3xl px-5 py-4 text-lg leading-relaxed ${message.role === "user" ? "ml-auto bg-[#175cd3] text-white" : "mr-auto bg-amber-50 text-slate-900"}`}><span className="mb-1 block text-sm font-bold opacity-75">{message.role === "user" ? "You" : "Bluey"}</span>{message.content}</div>)}{sending && <div className="mr-auto rounded-3xl bg-amber-50 px-5 py-4" role="status">Bluey is thinking…</div>}</div>{error && <div className="mx-5 mb-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800" role="alert">{error}</div>}<form onSubmit={submit} className="safe-bottom border-t-2 border-blue-100 p-4"><div className="mb-3 flex flex-wrap gap-2"><button type="button" onClick={listen} className="focus-ring min-h-12 rounded-xl border-2 border-blue-300 px-4 font-bold">🎤 Speak</button><label className="focus-ring flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-blue-300 px-4 font-bold">📷 Add photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} className="sr-only"/></label>{imageData && <span className="flex items-center rounded-xl bg-emerald-50 px-3 font-bold text-emerald-800">Photo ready ✓</span>}{inputMode === "voice" && <span className="flex items-center rounded-xl bg-blue-50 px-3 font-bold text-blue-800">Voice ready ✓</span>}</div><div className="flex gap-3"><label className="sr-only" htmlFor="question">Ask Bluey</label><textarea id="question" rows={2} value={input} onChange={(event) => { setInput(event.target.value); if (inputMode !== "image") setInputMode("text"); }} className="focus-ring min-h-16 flex-1 resize-none rounded-2xl border-2 border-slate-300 px-4 py-3" placeholder="Type your question here…"/><button disabled={sending || !input.trim()} className="focus-ring min-h-16 rounded-2xl bg-[#175cd3] px-6 font-bold text-white disabled:opacity-50">Send</button></div></form></section>
    </div>}
    {paywall && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-w-md rounded-3xl bg-white p-7 text-center"><div className="text-5xl">💙</div><h2 className="mt-3 text-3xl font-black">Keep chatting with Bluey</h2><p className="mt-3">You’ve used today’s 5 free questions. Unlimited chat is $9.99 per month.</p><button disabled={checkoutBusy} onClick={() => void checkout()} className="focus-ring mt-6 min-h-14 w-full rounded-2xl bg-[#175cd3] font-bold text-white disabled:opacity-50">{checkoutBusy ? "Opening checkout…" : "Subscribe"}</button><button onClick={() => setPaywall(false)} className="focus-ring mt-3 min-h-12 w-full rounded-2xl border-2 border-slate-300">Maybe later</button></div></div>}
  </main>;
}
