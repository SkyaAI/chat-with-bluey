# PRD — Chat-with-Bluey

## Problem
Elderly users (60+) have no single, friendly companion to help them with daily decisions (what to cook, when to take pills, when to drink water), stay physically and mentally active, or get a gentle nudge when they need it.

## Target User
Anyone aged 60+ who owns a smartphone. Assumes large text, simple navigation, and voice-first interaction.

## Core Objects
- **Conversation** — a named chat session
- **Message** — a user question or Bluey reply, with AI metadata
- **Reminder** — medication / water / toilet / stroll alert with schedule
- **Daily Usage** — per-user/session question count per day (quota enforcement)
- **Subscription** — Stripe-linked payment status
- **Audit Log** — payment and quota events

## MVP Must-Haves (v1)
- [ ] Chat screen renders demo conversations without login
- [ ] User can type a question and receive an AI reply
- [ ] Voice input supported via Web Speech API
- [ ] Daily free quota: 5 questions; 6th triggers subscription prompt
- [ ] Reminder CRUD (medication, water, toilet, stroll)
- [ ] Stripe Checkout for monthly subscription ($9.99/mo)
- [ ] Webhook marks subscription active; unlimited questions unlocked
- [ ] Large text, high-contrast UI, works on mobile browser

## Non-Goals (v1)
- Carer/family dashboard
- Wearable integration
- Ethical/medical disclaimer layer
- Native Android APK (PWA first)
- Per-user data isolation (deferred to lock-down sprint)

## Success Criteria
A tester opens the app on mobile, asks 5 cooking questions as a guest, sees the paywall prompt on the 6th, completes Stripe Checkout, and then asks a 7th question — which succeeds. All messages persist in Supabase and are visible on refresh.
