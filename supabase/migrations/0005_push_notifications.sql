create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_key text,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_key is not null)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  push_subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  delivery_key text not null,
  delivered_at timestamptz not null default now(),
  unique (reminder_id, push_subscription_id, delivery_key)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_session_key_idx on public.push_subscriptions (session_key);
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy push_subscriptions_owner_read on public.push_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);
