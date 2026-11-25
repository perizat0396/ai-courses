-- QR-регистрация на курс: код курса → самостоятельная регистрация с доступом
alter table public.courses add column if not exists join_code text unique;

create or replace function public.join_course(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into cid from public.courses where join_code = lower(trim(p_code));
  if cid is null then return null; end if;
  insert into public.enrollments (user_id, course_id) values (auth.uid(), cid) on conflict do nothing;
  return cid;
end $$;
revoke all on function public.join_course(text) from public, anon;
grant execute on function public.join_course(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  if new.raw_user_meta_data ? 'join_code' then
    select id into cid from public.courses where join_code = lower(trim(new.raw_user_meta_data->>'join_code'));
    if cid is not null then
      insert into public.enrollments (user_id, course_id) values (new.id, cid) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

update public.courses set join_code = 'kumis-ai'
where title_ru ilike '%для начинающих%' and join_code is null;

select id, title_ru, join_code, is_published from public.courses order by position;
