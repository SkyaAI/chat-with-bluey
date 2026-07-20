alter table public.conversations add column if not exists session_key text;
alter table public.messages add column if not exists session_key text;
alter table public.reminders add column if not exists session_key text;
alter table public.subscriptions add column if not exists session_key text;

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists conversations_session_key_idx on public.conversations (session_key);
create index if not exists messages_session_key_idx on public.messages (session_key);
create index if not exists reminders_session_key_idx on public.reminders (session_key);
create index if not exists subscriptions_session_key_idx on public.subscriptions (session_key);
create unique index if not exists subscriptions_stripe_subscription_unique
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
