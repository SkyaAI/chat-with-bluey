# Security — Chat-with-Bluey

## Secret Handling
- `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` stored in Vercel environment variables only
- Never referenced in any client-side file or exposed via API response
- All AI and payment calls go through `/api/*` server routes

## Permission Model (v1 → lock-down)
- **v1:** Permissive RLS — demo works without login; no sensitive personal data stored yet
- **Lock-down sprint:** Replace all `using (true)` policies with `using (auth.uid() = user_id)`; anonymous rows stay read-only
- Stripe webhook validated with `STRIPE_WEBHOOK_SECRET` signature check — rejects unsigned events

## Approved Tools Rule
Agents may only call named tools listed in `AGENTIC_LAYER.md`. No `eval`, no `run_any`, no raw shell. Each tool call logged to `audit_logs`.

## Audit Principle
Every meaningful state change (question asked, quota hit, reminder saved, payment initiated, subscription activated) writes a row to `audit_logs` with `user_id`, `event_type`, `payload`, and `created_at`. Logs are append-only; no delete policy on `audit_logs`.

## Payments
- Stripe Checkout hosted page — card data never touches our server
- Subscription status set only by verified Stripe webhook, not by client request
- If in doubt about payment or refund logic: stop and get a human.
