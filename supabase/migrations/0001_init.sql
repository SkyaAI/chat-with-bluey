create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);
alter table conversations enable row level security;
drop policy if exists "conversations_v1_read" on conversations;
create policy "conversations_v1_read" on conversations for select using (true);
drop policy if exists "conversations_v1_write" on conversations;
create policy "conversations_v1_write" on conversations for all using (true) with check (true);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  input_mode text default 'text' check (input_mode in ('text','voice','image')),
  image_url text,
  ai_reply text,
  ai_reply_source text,
  ai_reply_confidence numeric,
  ai_reply_review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table messages enable row level security;
drop policy if exists "messages_v1_read" on messages;
create policy "messages_v1_read" on messages for select using (true);
drop policy if exists "messages_v1_write" on messages;
create policy "messages_v1_write" on messages for all using (true) with check (true);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type text not null check (type in ('medication','water','toilet','stroll','custom')),
  label text not null,
  schedule_time time,
  repeat_interval_minutes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table reminders enable row level security;
drop policy if exists "reminders_v1_read" on reminders;
create policy "reminders_v1_read" on reminders for select using (true);
drop policy if exists "reminders_v1_write" on reminders;
create policy "reminders_v1_write" on reminders for all using (true) with check (true);

create table if not exists daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_key text,
  usage_date date not null default current_date,
  question_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table daily_usage enable row level security;
drop policy if exists "daily_usage_v1_read" on daily_usage;
create policy "daily_usage_v1_read" on daily_usage for select using (true);
drop policy if exists "daily_usage_v1_write" on daily_usage;
create policy "daily_usage_v1_write" on daily_usage for all using (true) with check (true);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive' check (status in ('active','inactive','cancelled','past_due')),
  plan text not null default 'monthly',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
drop policy if exists "subscriptions_v1_read" on subscriptions;
create policy "subscriptions_v1_read" on subscriptions for select using (true);
drop policy if exists "subscriptions_v1_write" on subscriptions;
create policy "subscriptions_v1_write" on subscriptions for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into conversations (id, title) values
  ('11111111-0000-0000-0000-000000000001', 'What to cook today?'),
  ('11111111-0000-0000-0000-000000000002', 'My medication reminder'),
  ('11111111-0000-0000-0000-000000000003', 'Afternoon walk game');

insert into messages (conversation_id, role, content, ai_reply, ai_reply_source, ai_reply_confidence, ai_reply_review_status) values
  ('11111111-0000-0000-0000-000000000001', 'user', 'I have eggs, tomatoes and bread at home. What can I make?', 'You can make a lovely scrambled egg on toast with sliced tomatoes on the side! Crack 2 eggs, whisk with a pinch of salt, cook on low heat and serve on toasted bread.', 'openai-gpt-4o', 0.93, 'unreviewed'),
  ('11111111-0000-0000-0000-000000000001', 'assistant', 'You can make a lovely scrambled egg on toast with sliced tomatoes on the side! Crack 2 eggs, whisk with a pinch of salt, cook on low heat and serve on toasted bread.', null, null, null, null),
  ('11111111-0000-0000-0000-000000000002', 'user', 'Remind me to take my blood pressure pill every day at 8am', 'Got it! I have set a daily reminder for 8:00 AM to take your blood pressure pill. I will alert you every morning.', 'openai-gpt-4o', 0.97, 'unreviewed'),
  ('11111111-0000-0000-0000-000000000002', 'assistant', 'Got it! I have set a daily reminder for 8:00 AM to take your blood pressure pill. I will alert you every morning.', null, null, null, null),
  ('11111111-0000-0000-0000-000000000003', 'user', 'I am bored, give me a fun game', 'Let us play a memory word game! I will say 5 fruits — Apple, Banana, Mango, Orange, Grape. Close your eyes for 10 seconds, then type back as many as you can remember!', 'openai-gpt-4o', 0.91, 'unreviewed'),
  ('11111111-0000-0000-0000-000000000003', 'assistant', 'Let us play a memory word game! I will say 5 fruits — Apple, Banana, Mango, Orange, Grape. Close your eyes for 10 seconds, then type back as many as you can remember!', null, null, null, null);

insert into reminders (type, label, schedule_time, repeat_interval_minutes, is_active) values
  ('medication', 'Blood pressure pill', '08:00', null, true),
  ('water', 'Drink a glass of water', null, 60, true),
  ('toilet', 'Toilet break', null, 120, true),
  ('stroll', 'Short afternoon walk', '15:00', null, true);