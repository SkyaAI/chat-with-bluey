# Architecture — Chat-with-Bluey

## Stack
- **Frontend:** Next.js 14 (App Router) — PWA manifest, installable on Android
- **Database:** Supabase (Postgres + RLS)
- **AI:** OpenAI GPT-4o via server-side API route (key never in frontend)
- **Payments:** Stripe Checkout + webhook
- **Hosting:** Vercel

## What Runs Without AI
The reminder engine, daily quota counter, and Stripe paywall all run on pure DB logic. If the AI is offline, the app still shows chat history, fires reminders, and processes payments.

## Key User Action — Step by Step
1. User types question in chat box (or taps microphone)
2. Next.js API route checks `daily_usage.question_count` for today
3. If count ≥ 5 AND no active subscription → return paywall flag → UI shows modal
4. Else → message row inserted into `messages` (role: user)
5. OpenAI called server-side; reply stored in same row (`ai_reply`, `ai_reply_source`, `ai_reply_confidence`)
6. Assistant message row inserted (role: assistant)
7. `daily_usage.question_count` incremented
8. UI re-fetches conversation; new reply renders

## Layer Plan
| Layer | What | When |
|---|---|---|
| Data | Tables, RLS, seed data | Sprint 1 |
| App logic | Chat CRUD, quota, reminders, Stripe | Sprints 1–2 |
| Smart features | AI replies, voice, image, game gen | Sprints 2–3 |
| Auth + isolation | OTP login, owner RLS | Sprint 4 |
| Notifications | PWA push, service worker | Sprint 5 |
