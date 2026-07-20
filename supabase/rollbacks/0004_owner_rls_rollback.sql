begin;

drop trigger if exists messages_audit_insert_v1 on public.messages;
drop function if exists public.consume_question();
drop schema if exists bluey_private cascade;

drop policy if exists conversations_owner_select on public.conversations;
drop policy if exists conversations_owner_insert on public.conversations;
drop policy if exists conversations_owner_update on public.conversations;
drop policy if exists conversations_owner_delete on public.conversations;
drop policy if exists messages_owner_select on public.messages;
drop policy if exists messages_owner_insert on public.messages;
drop policy if exists messages_owner_update on public.messages;
drop policy if exists messages_owner_delete on public.messages;
drop policy if exists reminders_owner_select on public.reminders;
drop policy if exists reminders_owner_insert on public.reminders;
drop policy if exists reminders_owner_update on public.reminders;
drop policy if exists reminders_owner_delete on public.reminders;
drop policy if exists daily_usage_owner_select on public.daily_usage;
drop policy if exists subscriptions_owner_select on public.subscriptions;

alter table public.conversations drop constraint if exists conversations_user_id_v1_required;
alter table public.messages drop constraint if exists messages_user_id_v1_required;
alter table public.reminders drop constraint if exists reminders_user_id_v1_required;
alter table public.daily_usage drop constraint if exists daily_usage_user_id_v1_required;
alter table public.subscriptions drop constraint if exists subscriptions_user_id_v1_required;
alter table public.audit_logs drop constraint if exists audit_logs_user_id_v1_required;

drop index if exists public.conversations_user_id_idx;
drop index if exists public.messages_user_conversation_created_idx;
drop index if exists public.reminders_user_id_idx;
drop index if exists public.subscriptions_user_id_idx;
drop index if exists public.audit_logs_user_created_idx;
drop index if exists public.daily_usage_user_date_unique;

grant select, insert, update, delete
  on public.conversations, public.messages, public.reminders,
     public.daily_usage, public.subscriptions, public.audit_logs
  to anon, authenticated;

create policy conversations_v1_read on public.conversations
for select using (true);
create policy conversations_v1_write on public.conversations
for all using (true) with check (true);
create policy messages_v1_read on public.messages
for select using (true);
create policy messages_v1_write on public.messages
for all using (true) with check (true);
create policy reminders_v1_read on public.reminders
for select using (true);
create policy reminders_v1_write on public.reminders
for all using (true) with check (true);
create policy daily_usage_v1_read on public.daily_usage
for select using (true);
create policy daily_usage_v1_write on public.daily_usage
for all using (true) with check (true);
create policy subscriptions_v1_read on public.subscriptions
for select using (true);
create policy subscriptions_v1_write on public.subscriptions
for all using (true) with check (true);
create policy audit_logs_v1_read on public.audit_logs
for select using (true);
create policy audit_logs_v1_write on public.audit_logs
for all using (true) with check (true);

create or replace function public.consume_guest_question(
  p_session_key text,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_count integer;
begin
  if p_session_key is null or length(p_session_key) < 8 then
    raise exception 'invalid session key';
  end if;

  insert into public.daily_usage (session_key, usage_date, question_count)
  values (p_session_key, current_date, 1)
  on conflict (session_key, usage_date) where session_key is not null
  do update set question_count = public.daily_usage.question_count + 1
  where public.daily_usage.question_count < p_limit
  returning question_count into next_count;

  if next_count is null then
    select question_count into next_count
    from public.daily_usage
    where session_key = p_session_key and usage_date = current_date;
    return jsonb_build_object(
      'allowed', false,
      'count', coalesce(next_count, p_limit)
    );
  end if;

  return jsonb_build_object('allowed', true, 'count', next_count);
end;
$$;

grant execute on function public.consume_guest_question(text, integer)
  to anon, authenticated;

commit;
