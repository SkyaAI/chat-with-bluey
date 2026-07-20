"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import RemindersPanel from "@/app/ui/reminders-panel";
import GamesPanel from "@/app/ui/games-panel";
import AccountPanel from "@/app/ui/account-panel";
import { createClient, ensureAnonymousUser } from "@/lib/supabase/client";

type Conversation = { id: string; title: string; created_at: string };
type Message = { id: string; conversation_id: string; role: "user" | "assistant"; content: string; input_mode: string; created_at: string };

function sessionKey() {
  const existing = localStorage.getItem("bluey-session-key");
  if (existing) return existing;
  const created = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem("bluey-session-key", created);
  return created;
}

export default function BlueyApp() {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [view, setView] = useState<"chat" | "reminders" | "games" | "account">("chat");
  const [subscribed, setSubscribed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice" | "image">("text");
  const [imageData, setImageData] = useState<string | undefined>();

  const load = useCallback(async (conversationId?: string | null) => {
    setLoading(true); setError("");
    try {
      const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
      const response = await fetch(`/api/chat${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConversations(data.conversations); setMessages(data.messages); setUsed(data.used); setSubscribed(data.subscribed);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bluey can‚Äôt connect right now. Try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    async function startSecureGuestSession() {
      try {
        await ensureAnonymousUser(supabase);
        if (active) await load(null);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Bluey could not start a secure guest session.");
          setLoading(false);
        }
      }
    }
    void startSecureGuestSession();
    return () => { active = false; };
  }, [load, supabase]);
  const selectedConversation = useMemo(() => conversations.find((item) => item.id === selected), [conversations, selected]);

  async function choose(id: string) { setSelected(id); await load(id); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!input.trim() || sending) return;
    const content = input.trim(); setInput(""); setSending(true); setError("");
    setMessages((current) => [...current, { id: `temp-${Date.now()}`, conversation_id: selected ?? "", role: "user", content, input_mode: "text", created_at: new Date().toISOString() }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected, content, inputMode, imageData }) });
      const data = await response.json();
      if (response.status === 402) { setPaywall(true); setUsed(data.used); return; }
      if (!response.ok) throw new Error(data.error);
      setSelected(data.conversationId); setUsed(data.used); setInputMode("text"); setImageData(undefined); await load(data.conversationId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bluey can‚Äôt connect right now. Try again."); }
    finally { setSending(false); }
  }

  async function checkout() {
    setCheckoutBusy(true); setError("");
    try { const response = await fetch("/api/checkout", { method: "POST", headers: { "x-session-key": sessionKey() } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!data.url) throw new Error("Checkout did not rgø8“⁄$z{-ÆÈ‹j◊ù This includes
-- anonymous Supabase users: they have auth.uid() and use the authenticated role.
-- Legacy rows are deliberately left untouched and become inaccessible until a
-- separately approved claim or deletion migration is run.

create schema if not exists bluey_private;
revoke all on schema bluey_private from public, anon, authenticated;
grant usage on schema bluey_private to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reminders enable row level security;
alter table public.daily_usage enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists conversations_v1_read on public.conversations;
drop policy if exists conversations_v1_write on public.conversations;
drop policy if exists conversations_owner_select on public.conversations;
drop policy if exists conversations_owner_insert on public.conversations;
drop policy if exists conversations_owner_update on public.conversations;
drop policy if exists conversations_owner_delete on public.conversations;

drop policy if exists messages_v1_read on public.messages;
drop policy if exists messages_v1_write on public.messages;
drop policy if exists messages_owner_select on public.messages;
drop policy if exists messages_owner_insert on public.messages;
drop policy if exists messages_owner_update on public.messages;
drop policy if exists messages_owner_delete on public.messages;

drop policy if exists reminders_v1_read on public.reminders;
drop policy if exists reminders_v1_write on public.reminders;
drop policy if exists reminders_owner_select on public.reminders;
drop policy if exists reminders_owner_insert on public.reminders;
drop policy if exists reminders_owner_update on public.reminders;
drop policy if exists reminders_owner_delete on public.reminders;

drop policy if exists daily_usage_v1_read on public.daily_usage;
drop policy if exists daily_usage_v1_write on public.daily_usage;
drop policy if exists daily_usage_owner_select on public.daily_usage;

drop policy if exists subscriptions_v1_read on public.subscriptions;
drop policy if exists subscriptions_v1_write on public.subscriptions;
drop policy if exists subscriptions_owner_select on public.subscriptions;

drop policy if exists audit_logs_v1_read on public.audit_logs;
drop policy if exists audit_logs_v1_write on public.audit_logs;

-- NOT VALID preserves legacy null-owned rows while enforcing ownership on all
-- newly inserted or subsequently updated rows.
alter table public.conversations
  add constraint conversations_user_id_v1_required check (user_id is not null) not valid;
alter table public.messages
  add constraint messages_user_id_v1_required check (user_id is not null) not valid;
alter table public.reminders
  add constraint reminders_user_id_v1_required check (user_id is not null) not valid;
alter table public.daily_usage
  add constraint daily_usage_user_id_v1_required check (user_id is not null) not valid;
alter table public.subscriptions
  add constraint subscriptions_user_id_v1_required check (user_id is not null) not valid;
alter table public.audit_logs
  add constraint audit_logs_user_id_v1_required check (user_id is not null) not valid;

create index if not exists conversations_user_id_idx
  on public.conversations (user_id);
create index if not exists messages_user_conversation_created_idx
  on public.messages (user_id, conversation_id, created_at);
create index if not exists reminders_user_id_idx
  on public.reminders (user_id);
create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);
create index if not exists audit_logs_user_created_idx
  on public.audit_logs (user_id, created_at desc);
create unique index if not exists daily_usage_user_date_unique
  on public.daily_usage (user_id, usage_date)
  where user_id is not null;

revoke all on public.conversations, public.messages, public.reminders,
  public.daily_usage, public.subscriptions, public.audit_logs from public, anon;
revoke all on public.conversations, public.messages, public.reminders,
  public.daily_usage, public.subscriptions, public.audit_logs from authenticated;

grant select, insert, update, delete
  on public.conversations, public.messages, public.reminders
  to authenticated;
grant select on public.daily_usage, public.subscriptions to authenticated;

create policy conversations_owner_select
on public.conversations for select to authenticated
using ((select auth.uid()) = user_id);

create policy conversations_owner_insert
on public.conversations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy conversations_owner_update
on public.conversations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy conversations_owner_delete
on public.conversations for delete to authenticated
using ((select auth.uid()) = user_id);

create policy messages_owner_select
on public.messages for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy messages_owner_insert
on public.messages for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy messages_owner_update
on public.messages for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy messages_owner_delete
on public.messages for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy reminders_owner_select
on public.reminders for select to authenticated
using ((select auth.uid()) = user_id);

create policy reminders_owner_insert
on public.reminders for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy reminders_owner_update
on public.reminders for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy reminders_owner_delete
on public.reminders for delete to authenticated
using ((select auth.uid()) = user_id);

create policy daily_usage_owner_select
on public.daily_usage for select to authenticated
using ((select auth.uid()) = user_id);

create policy subscriptions_owner_select
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

-- Replaces the legacy session-key RPC. It accepts no identity or limit input:
-- both the owner and the five-question limit are fixed inside the database.
revoke all on function public.consume_guest_question(text, integer)
  from public, anon, authenticated;
drop function if exists public.consume_guest_question(text, integer);

create or replace function bluey_private.consume_question()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_next_count integer;
  v_current_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.daily_usage (user_id, usage_date, question_count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, usage_date) where user_id is not null
  do update set question_count = public.daily_usage.question_count + 1
  where public.daily_usage.question_count < 5
  returning question_count into v_next_count;

  if v_next_count is null then
    select question_count into v_current_count
    from public.daily_usage
    where user_id = v_user_id and usage_date = current_date;

    if not exists (
      select 1 from public.audit_logs
      where user_id = v_user_id
        and event_type = 'quota_hit'
        and created_at >= date_trunc('day', now())
    ) then
      insert into public.audit_logs (
        user_id, event_type, entity_type, payload
      ) values (
        v_user_id,
        'quota_hit',
        'daily_usage',
        jsonb_build_object('question_count', coalesce(v_current_count, 5))
      );
    end if;

    return jsonb_build_object(
      'allowed', false,
      'count', coalesce(v_current_count, 5)
    );
  end if;

  return jsonb_build_object('allowed', true, 'count', v_next_count);
end;
$$;

revoke all on function bluey_private.consume_question()
  from public, anon, authenticated;
grant execute on function bluey_private.consume_question() to authenticated;

create or replace function public.consume_question()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select bluey_private.consume_question();
$$;

revoke all on function public.consume_question()
  from public, anon, authenticated;
grant execute on function public.consume_question() to authenticated;

-- Audit events are generated from trusted database state. Clients receive no
-- INSERT, UPDATE, DELETE, or SELECT privilege on audit_logs.
create or replace function bluey_private.audit_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'user' then
    insert into public.audit_logs (
      user_id, event_type, entity_type, entity_id, payload
    ) values (
      new.user_id,
      'question_asked',
      'message',
      new.id,
      jsonb_build_object('input_mode', new.input_mode)
    );
  end if;
  return new;
end;
$$;

revoke all on function bluey_private.audit_message_insert()
  from public, anon, authenticated;

drop trigger if exists messages_audit_insert_v1 on public.messages;
create trigger messages_audit_insert_v1
after insert on public.messages
for each row execute function bluey_private.audit_message_insert();

commit;
