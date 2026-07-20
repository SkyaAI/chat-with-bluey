create unique index if not exists daily_usage_session_date_unique
  on public.daily_usage (session_key, usage_date)
  where session_key is not null;

create or replace function public.consume_guest_question(p_session_key text, p_limit integer default 5)
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
    return jsonb_build_object('allowed', false, 'count', coalesce(next_count, p_limit));
  end if;

  return jsonb_build_object('allowed', true, 'count', next_count);
end;
$$;

grant execute on function public.consume_guest_question(text, integer) to anon, authenticated;
