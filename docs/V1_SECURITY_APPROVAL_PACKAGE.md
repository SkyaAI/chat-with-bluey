# Version 1 Security Approval Package

Status: prepared locally only. Neither SQL file has been applied. Anonymous Auth
has not been enabled, no production rows were changed, and no deployment or paid
provider call was made.

## Normative SQL

- Forward migration: `supabase/migrations/0004_owner_rls.sql`
- Emergency rollback: `supabase/rollbacks/0004_owner_rls_rollback.sql`

The files above are the exact approval candidates. The forward migration is one
transaction. Existing rows are not updated or deleted.

## Forward migration actions

1. Creates a non-exposed `bluey_private` schema for privileged implementation
   functions and removes default access to it.
2. Confirms RLS is enabled on conversations, messages, reminders, daily usage,
   subscriptions, and audit logs.
3. Drops the twelve unrestricted Version 1 read/write policies.
4. Adds `NOT VALID` ownership checks. These allow legacy null-owned rows to stay
   untouched but reject every new or updated null-owned row.
5. Adds ownership indexes and a unique per-user/per-day quota index.
6. Removes all table access from `anon` and `PUBLIC`.
7. Gives `authenticated` users owner-scoped CRUD on conversations, messages,
   and reminders; read-only access to their own usage and subscription status;
   and no direct access to audit logs.
8. Makes message policies verify both the message owner and the parent
   conversation owner. Knowing another conversation UUID is insufficient.
9. Drops the session-key quota RPC and creates parameterless `consume_question`.
   The owner comes only from `auth.uid()` and the limit is fixed at five.
10. Makes quota mutation atomic. A rejected sixth request writes at most one
    `quota_hit` audit event per owner per day.
11. Adds a locked-down message trigger that writes `question_asked` from trusted
    inserted row data. Clients cannot fabricate, edit, read, or delete audit logs.

## Application changes

- `lib/supabase/client.ts`: create or recover an anonymous Supabase user before
  the first chat request.
- `lib/supabase/server.ts`: unchanged; it already creates a request-scoped SSR
  client from the request cookies and writes refreshed cookies where permitted.
- `lib/supabase/middleware.ts`: unchanged; it already refreshes the cookie-backed
  Supabase session on active requests.
- `lib/auth.ts`: adds `requireAuthenticatedUser`, which validates the JWT through
  `auth.getUser()` and returns the same request-scoped client used for data calls.
- `app/ui/bluey-app.tsx`: waits for anonymous sign-in before loading chat and no
  longer sends `x-session-key` for chat requests.
- `app/ui/account-panel.tsx`: identifies the anonymous user as a secure guest and
  keeps permanent sign-in disabled for this stage.
- `app/api/chat/route.ts`: uses the JWT client, writes `user_id`, calls the secure
  quota RPC, and proves conversation ownership before reads, quota use, or writes.
- `lib/supabase/admin.ts`: removes the service-role fallback. Paused system routes
  therefore cannot bypass RLS.
- `.env.example`: removes `SUPABASE_SERVICE_ROLE_KEY` from the runtime contract.

Stripe, OpenAI configuration, reminder delivery, games, push, VAPID, migration
0005, and paid services are not changed. Existing optional routes that still use
the legacy unauthenticated data client will fail closed after 0004 and remain
paused until separately redesigned.

## Enabling anonymous authentication

This is a separate production configuration action and requires approval:

1. Open the `chat-with-bluey` project in Supabase.
2. Open Authentication settings and the Anonymous Sign-Ins provider/configuration.
3. Review the current anonymous-user rate limit; keep the provider default or a
   stricter value for the first test.
4. Enable Anonymous Sign-Ins.
5. Do not enable manual identity linking yet; permanent sign-in is a later stage.
6. Do not enable a paid CAPTCHA or other provider in this stage.

Supabase recommends CAPTCHA/Turnstile for a public anonymous-auth application.
Before paid AI or Beta access, an anti-abuse decision is required. No paid AI key
will be present during the database-security test.

## Browser session and ownership

`signInAnonymously()` creates an Auth user and a JWT/refresh-token session. The
Supabase browser client persists it in cookies. Same-origin API requests include
the cookies automatically. Middleware refreshes expiring tokens, and each API
route validates the user with `getUser()` before querying data. The exact same
request-scoped client then sends the JWT to the Data API, so RLS sees the correct
`auth.uid()`.

New conversations and messages set `user_id` to that authenticated UUID and do
not set `session_key`. RLS independently verifies every select, insert, update,
and delete. Clearing browser storage or signing out loses an unlinked anonymous
identity; the app must warn users before a future sign-out control is added.

When permanent sign-in is approved, the anonymous user will add/link a verified
identity to the existing Auth user rather than start a different account. Its
UUID and all row ownership therefore remain unchanged. Signing into an already
existing separate account requires an explicit merge design and is not included.

## Existing row options

The live legacy rows stay unchanged and hidden by the new policies.

1. **Preserve hidden (recommended for rollout):** keep all legacy test/seed rows
   intact but inaccessible. This is fully reversible and changes no row.
2. **Claim selected guest rows later:** after verifying a new anonymous user,
   apply a separately reviewed one-time claim function/migration. It would update
   `user_id` only for rows matching a proven legacy session key. This modifies
   production rows and requires separate approval.
3. **Delete test rows later:** delete identified seed and guest test rows after a
   reviewed count/export. This is destructive and requires separate approval.

Recommendation: option 1 during the security rollout. Decide between claim and
delete only after two-user isolation and rollback tests pass.

## Execution order after approval

The old application and new database contract are not mutually compatible, so a
short controlled maintenance window is required:

1. Record policy definitions, grants, migration status, and aggregate row counts.
2. Build a non-production commit containing this exact application and SQL diff.
3. Enable anonymous Auth.
4. Apply the forward migration through the authenticated Supabase integration.
5. Immediately deploy/promote the prepared application commit.
6. Run the isolation test matrix below before normal testing resumes.
7. If the migration or smoke test fails, apply the rollback SQL and restore the
   prior application commit. The rollback restores insecure policies, so it is an
   emergency bridge only.

## Complete post-migration test plan

### Database preflight and integrity

- Capture aggregate row counts for all six tables without reading message text.
- Capture `pg_policies`, table grants, constraints, indexes, functions, triggers,
  and migration history.
- After migration, confirm all six tables and every existing column remain.
- Confirm aggregate legacy row counts are identical and no legacy `user_id` was
  changed.
- Confirm RLS remains enabled on every table.
- Confirm security and performance advisors have no always-true write finding.

### Grant and function tests

- `anon` cannot select, insert, update, or delete any affected table.
- `anon` cannot execute either quota implementation function.
- `authenticated` cannot directly insert/update/delete `daily_usage`.
- `authenticated` cannot directly read or mutate `audit_logs`.
- `consume_question()` accepts no user ID, session key, or limit parameter.
- Direct access to `bluey_private` through the Data API is unavailable.

### Guest A tests

- Anonymous sign-in creates a user and cookie-backed session.
- First chat creates a conversation and two messages with Guest A's `user_id`.
- Refresh restores the same conversation and messages.
- Questions one through five increment one daily-usage row atomically.
- Question six returns the paywall response without incrementing past five.
- Repeated sixth attempts create no more than one daily `quota_hit` audit row.
- A user-message insert creates one trusted `question_asked` audit row.

### Guest B isolation tests

- A separate clean browser profile receives a different `auth.uid()`.
- Guest B cannot list Guest A's conversation or messages.
- `GET /api/chat?conversationId=<guest-a-id>` returns 404.
- `POST /api/chat` with Guest A's ID returns 404 before quota changes.
- Direct Data API select/update/delete against Guest A returns no rows.
- Direct message insert referencing Guest A's conversation is rejected by RLS.
- Guest A's row counts and content are unchanged after every Guest B attempt.
- Guest B has an independent quota row and count.

### Ownership mutation tests

- A guest cannot insert a row with a different `user_id`.
- A guest cannot change an owned row's `user_id`.
- A guest cannot insert or move a message into an unowned conversation.
- A request without a valid cookie/JWT receives HTTP 401 from the chat API.
- An invalid UUID receives HTTP 400 without quota consumption.

### Session tests

- Token refresh preserves the same `auth.uid()` and access.
- Reload and browser restart preserve access while cookies remain.
- A separate browser profile has no access.
- Clearing cookies intentionally loses access to the unlinked anonymous identity;
  legacy and other users' rows do not become visible.

### Rollback rehearsal

- Validate rollback SQL syntax before production execution.
- If invoked, confirm the new functions, trigger, policies, constraints, and
  indexes are removed and the prior policies/function are restored.
- Restore the prior application commit at the same time.
- Confirm row counts remain unchanged.
- Run one old guest read/write smoke test, then schedule a corrected security
  migration immediately because rollback reopens public access.

### Local verification already completed

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.
- `git diff --check`: passed.
- No remote SQL execution or end-to-end database test was performed because that
  would require applying the migration or creating an approved isolated database.
