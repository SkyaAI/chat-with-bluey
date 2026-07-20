-- Requires SUPABASE_SERVICE_ROLE_KEY in server routes before application.
do $$
declare t text;
begin
  foreach t in array array['conversations','messages','reminders','daily_usage','subscriptions','audit_logs'] loop
    execute format('drop policy if exists %I on public.%I', t || '_v1_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_v1_write', t);
  end loop;
end $$;

create policy conversations_read on public.conversations for select to anon, authenticated
using ((user_id is null and session_key is null) or (select auth.uid()) = user_id);
create policy conversations_owner_write on public.conversations for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy messages_read on public.messages for select to anon, authenticated
using ((user_id is null and session_key is null) or (select auth.uid()) = user_id);
create policy messages_owner_write on public.messages for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy reminders_read on public.reminders for select to anon, authenticated
using ((user_id is null and session_key is null) or (select auth.uid()) = user_id);
create policy reminders_owner_write on public.reminders for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy daily_usage_owner_read on public.daily_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_usage_owner_write on public.daily_usage for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subscriptions_owner_read on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy subscriptions_owner_write on public.subscriptions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy audit_logs_owner_read on public.audit_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy audit_logs_owner_insert on public.audit_logs for insert to authenticated with check ((select auth.uid()) = user_id);
