# Version 1 security rollout baseline

Captured read-only from Supabase project `oqklfkxvgpkxusgrytmx` at
`2026-07-20 06:21:17.653693 UTC`, before enabling Anonymous Sign-Ins and before
applying revised migration 0004.

This record contains aggregate counts and schema metadata only. It does not
contain message content, session keys, access tokens, API keys, or other secret
values.

## Migration and rollback record

- Revised migration: `supabase/migrations/0004_owner_rls.sql`
- Migration SHA-256: `C0F345A8B0F6ADD190CC6292DD00CA60EF84FF55B821077D4CD023956599BF1D`
- Rollback: `supabase/rollbacks/0004_owner_rls_rollback.sql`
- Rollback SHA-256: `F2AA6D52DD71901AD981FAE32715A8A7C763409DEB91B5618167045E6973FFEE`
- The committed copies of these two files are the exact pre-rollout backup.

The Supabase migration history contained only:

- `20260720010046 atomic_guest_quota`
- `20260720014126 guest_scope_payments`

Revised migration 0004 was not present and was not applied while creating this
record.

## Row counts

| Table | Total rows | Rows with null `user_id` |
|---|---:|---:|
| `audit_logs` | 27 | 27 |
| `conversations` | 5 | 5 |
| `daily_usage` | 4 | 4 |
| `messages` | 28 | 28 |
| `reminders` | 4 | 4 |
| `subscriptions` | 0 | 0 |
| **Total** | **68** | **68** |

These legacy and seeded rows are to be preserved unchanged and made
inaccessible to normal anonymous or authenticated clients by the revised
policies. They must not be claimed, deleted, or assigned a `user_id`.

## RLS status

Row Level Security was enabled, but not forced, on all six tables:

- `audit_logs`
- `conversations`
- `daily_usage`
- `messages`
- `reminders`
- `subscriptions`

## Existing policy catalogue

Each policy was permissive and assigned to the `public` database role.

| Table | Read policy | Command / expression | Write policy | Command / expressions |
|---|---|---|---|---|
| `audit_logs` | `audit_logs_v1_read` | `SELECT USING (true)` | `audit_logs_v1_write` | `ALL USING (true) WITH CHECK (true)` |
| `conversations` | `conversations_v1_read` | `SELECT USING (true)` | `conversations_v1_write` | `ALL USING (true) WITH CHECK (true)` |
| `daily_usage` | `daily_usage_v1_read` | `SELECT USING (true)` | `daily_usage_v1_write` | `ALL USING (true) WITH CHECK (true)` |
| `messages` | `messages_v1_read` | `SELECT USING (true)` | `messages_v1_write` | `ALL USING (true) WITH CHECK (true)` |
| `reminders` | `reminders_v1_read` | `SELECT USING (true)` | `reminders_v1_write` | `ALL USING (true) WITH CHECK (true)` |
| `subscriptions` | `subscriptions_v1_read` | `SELECT USING (true)` | `subscriptions_v1_write` | `ALL USING (true) WITH CHECK (true)` |

## Security Advisor baseline

The Security Advisor reported six `rls_policy_always_true` warnings, one for
each `*_v1_write` policy above. The post-migration check must confirm that none
of these six warnings remains and must report any new warning.

Official remediation reference:
https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy

## Required post-migration invariants

- Each table's total row count remains exactly as above before any security-test
  rows are created.
- The 68 existing rows retain null `user_id` values.
- No migration statement updates or deletes an application row.
- Test-created rows are separately identified and reconciled in the test report.
- Revised migration 0004 is the only newly applied migration.
