-- =====================================================================
--  ИИ-помощник (Gemini): предварительная проверка заданий + лимиты запросов
--  Запустите после schema.sql (повторный запуск безопасен).
-- =====================================================================

alter table public.submissions add column if not exists ai_feedback text not null default '';
alter table public.submissions add column if not exists ai_at timestamptz;

-- Счётчик запросов к ИИ: на человека, на день, по типу (chat / review)
create table if not exists public.ai_usage (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null default current_date,
  kind     text not null,
  count    int  not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
drop policy if exists p_ai_usage_sel on public.ai_usage;
create policy p_ai_usage_sel on public.ai_usage for select using (user_id = auth.uid() or public.is_admin());

-- Списать один запрос; false — дневной лимит исчерпан (у админа лимита нет)
create or replace function public.ai_take(p_kind text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then return false; end if;
  if public.is_admin() then return true; end if;
  insert into public.ai_usage (user_id, day, kind, count) values (auth.uid(), current_date, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count into v;
  return v <= p_limit;
end $$;
grant execute on function public.ai_take(text, int) to authenticated;
