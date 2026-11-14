-- ВСЁ В ОДНОМ: schema.sql + seed.sql + ai.sql. Запускать ОДИН раз на новом проекте Supabase.

-- =====================================================================
--  AI Courses platform — схема базы данных для Supabase
--  Запустите целиком: Supabase → SQL Editor → New query → Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Профили пользователей ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text not null default '',
  role        text not null default 'student' check (role in ('admin','student')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Курсы / модули / уроки ----------
create table if not exists public.courses (
  id              uuid primary key default gen_random_uuid(),
  title_ru        text not null,
  title_kk        text not null default '',
  description_ru  text not null default '',
  description_kk  text not null default '',
  theme           text not null default 'yellow' check (theme in ('yellow','black','white')),
  is_published    boolean not null default false,
  position        int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title_ru   text not null,
  title_kk   text not null default '',
  position   int not null default 0
);

create table if not exists public.lessons (
  id             uuid primary key default gen_random_uuid(),
  module_id      uuid not null references public.modules(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  title_ru       text not null,
  title_kk       text not null default '',
  video_url      text,          -- ссылка YouTube / Vimeo / mp4
  video_path     text,          -- или загруженный файл в хранилище lesson-files
  content_ru     text not null default '',   -- Markdown
  content_kk     text not null default '',
  assignment_ru  text not null default '',   -- текст задания (пусто = без задания)
  assignment_kk  text not null default '',
  duration_min   int,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

-- course_id урока всегда берётся из модуля
create or replace function public.lessons_set_course()
returns trigger language plpgsql as $$
begin
  select course_id into new.course_id from public.modules where id = new.module_id;
  return new;
end $$;

drop trigger if exists lessons_set_course on public.lessons;
create trigger lessons_set_course before insert or update of module_id on public.lessons
  for each row execute function public.lessons_set_course();

create table if not exists public.lesson_files (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  name        text not null,
  path        text not null,
  size        bigint,
  created_at  timestamptz not null default now()
);

-- ---------- Тесты ----------
-- Вопросы видят студенты, правильные ответы — только админ (отдельная таблица)
create table if not exists public.quiz_questions (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  question_ru  text not null,
  question_kk  text not null default '',
  options_ru   text[] not null,
  options_kk   text[] not null default '{}',
  position     int not null default 0
);

create table if not exists public.quiz_answers (
  question_id    uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index  int not null
);

-- ---------- Доступы и прогресс ----------
create table if not exists public.enrollments (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.lesson_progress (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  answers     int[] not null,
  score       int not null,
  total       int not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  body         text not null default '',
  file_path    text,
  status       text not null default 'submitted' check (status in ('submitted','accepted','needs_work')),
  feedback     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  unique (user_id, lesson_id)
);

create index if not exists modules_course_idx on public.modules(course_id, position);
create index if not exists lessons_module_idx on public.lessons(module_id, position);
create index if not exists lessons_course_idx on public.lessons(course_id);
create index if not exists files_lesson_idx on public.lesson_files(lesson_id);
create index if not exists quiz_lesson_idx on public.quiz_questions(lesson_id, position);
create index if not exists enroll_course_idx on public.enrollments(course_id);
create index if not exists subm_status_idx on public.submissions(status, updated_at);

-- ---------- Вспомогательные функции ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Есть ли у текущего пользователя доступ к курсу (доступ выдан И курс опубликован)
create or replace function public.has_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = auth.uid() and e.course_id = cid and c.is_published
  );
$$;

create or replace function public.has_lesson(lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lessons l where l.id = lid and public.has_course(l.course_id));
$$;

-- Проверка теста на сервере: студент не видит правильных ответов
create or replace function public.submit_quiz(p_lesson uuid, p_answers int[])
returns json language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_score int; v_correct int[];
begin
  if auth.uid() is null or not public.has_lesson(p_lesson) then
    raise exception 'no access';
  end if;
  select coalesce(array_agg(a.correct_index order by q.position, q.id), '{}'), count(*)
    into v_correct, v_total
  from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id
  where q.lesson_id = p_lesson;

  select count(*) into v_score
  from generate_subscripts(v_correct, 1) i
  where p_answers[i] is not null and p_answers[i] = v_correct[i];

  insert into public.quiz_attempts (user_id, lesson_id, answers, score, total)
  values (auth.uid(), p_lesson, p_answers, v_score, v_total);

  return json_build_object('score', v_score, 'total', v_total, 'correct', v_correct);
end $$;

-- Сдача задания студентом (статус всегда сбрасывается на «на проверке»)
create or replace function public.submit_assignment(p_lesson uuid, p_body text, p_file text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_lesson(p_lesson) then
    raise exception 'no access';
  end if;
  if p_file is not null and p_file not like auth.uid()::text || '/%' then
    raise exception 'bad file path';
  end if;
  insert into public.submissions (user_id, lesson_id, body, file_path)
  values (auth.uid(), p_lesson, coalesce(p_body, ''), p_file)
  on conflict (user_id, lesson_id) do update
    set body = excluded.body,
        file_path = coalesce(excluded.file_path, public.submissions.file_path),
        status = 'submitted',
        updated_at = now()
    where public.submissions.status <> 'accepted';
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_files    enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.quiz_answers    enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.submissions     enable row level security;

-- profiles: видит себя (админ — всех); менять можно только своё имя
drop policy if exists p_profiles_sel on public.profiles;
create policy p_profiles_sel on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update using (id = auth.uid() or public.is_admin());
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- Контент: читать — у кого есть доступ к курсу; изменять — только админ
drop policy if exists p_courses_sel on public.courses;
create policy p_courses_sel on public.courses for select using (public.has_course(id));
drop policy if exists p_courses_adm on public.courses;
create policy p_courses_adm on public.courses for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_modules_sel on public.modules;
create policy p_modules_sel on public.modules for select using (public.has_course(course_id));
drop policy if exists p_modules_adm on public.modules;
create policy p_modules_adm on public.modules for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_lessons_sel on public.lessons;
create policy p_lessons_sel on public.lessons for select using (public.has_course(course_id));
drop policy if exists p_lessons_adm on public.lessons;
create policy p_lessons_adm on public.lessons for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_files_sel on public.lesson_files;
create policy p_files_sel on public.lesson_files for select using (public.has_lesson(lesson_id));
drop policy if exists p_files_adm on public.lesson_files;
create policy p_files_adm on public.lesson_files for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_quiz_sel on public.quiz_questions;
create policy p_quiz_sel on public.quiz_questions for select using (public.has_lesson(lesson_id));
drop policy if exists p_quiz_adm on public.quiz_questions;
create policy p_quiz_adm on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_answers_adm on public.quiz_answers;
create policy p_answers_adm on public.quiz_answers for all using (public.is_admin()) with check (public.is_admin());

-- Доступы: студент видит свои, выдаёт/забирает только админ
drop policy if exists p_enr_sel on public.enrollments;
create policy p_enr_sel on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists p_enr_adm on public.enrollments;
create policy p_enr_adm on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

-- Прогресс: своё
drop policy if exists p_prog_sel on public.lesson_progress;
create policy p_prog_sel on public.lesson_progress for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists p_prog_ins on public.lesson_progress;
create policy p_prog_ins on public.lesson_progress for insert with check (user_id = auth.uid() and public.has_lesson(lesson_id));
drop policy if exists p_prog_del on public.lesson_progress;
create policy p_prog_del on public.lesson_progress for delete using (user_id = auth.uid());

drop policy if exists p_att_sel on public.quiz_attempts;
create policy p_att_sel on public.quiz_attempts for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists p_sub_sel on public.submissions;
create policy p_sub_sel on public.submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists p_sub_adm on public.submissions;
create policy p_sub_adm on public.submissions for update using (public.is_admin()) with check (public.is_admin());

grant execute on function public.submit_quiz(uuid, int[]) to authenticated;
grant execute on function public.submit_assignment(uuid, text, text) to authenticated;

-- ---------- Хранилище файлов ----------
-- lesson-files:  <lesson_id>/<файл>          — материалы и видео уроков
-- submissions:   <user_id>/<lesson_id>/<файл> — файлы студентов к заданиям
insert into storage.buckets (id, name, public) values ('lesson-files', 'lesson-files', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false)
  on conflict (id) do nothing;

drop policy if exists s_lesson_read on storage.objects;
create policy s_lesson_read on storage.objects for select using (
  bucket_id = 'lesson-files' and (
    public.is_admin() or exists (
      select 1 from public.lessons l
      where l.id::text = (storage.foldername(name))[1] and public.has_course(l.course_id)
    )
  )
);
drop policy if exists s_lesson_admin on storage.objects;
create policy s_lesson_admin on storage.objects for all
  using (bucket_id = 'lesson-files' and public.is_admin())
  with check (bucket_id = 'lesson-files' and public.is_admin());

drop policy if exists s_sub_read on storage.objects;
create policy s_sub_read on storage.objects for select using (
  bucket_id = 'submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
drop policy if exists s_sub_write on storage.objects;
create policy s_sub_write on storage.objects for insert with check (
  bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================
--  Стартовое наполнение: 2 курса со структурой модулей и уроков.
--  Запускать ОДИН раз после schema.sql. Курсы создаются неопубликованными —
--  опубликуйте их в админке, когда наполните уроки.
-- =====================================================================

do $$
declare
  c1 uuid; c2 uuid; m uuid; l uuid; q uuid;
begin
  -- ================= Курс 1 =================
  insert into public.courses (title_ru, title_kk, description_ru, description_kk, theme, position)
  values (
    'Искусственный интеллект с нуля',
    'Жасанды интеллект нөлден бастап',
    'Курс для взрослых без технического опыта: что такое ИИ, как пользоваться ChatGPT, Claude и Gemini в работе и в жизни, как писать запросы и проверять ответы.',
    'Техникалық тәжірибесі жоқ ересектерге арналған курс: ЖИ деген не, ChatGPT, Claude және Gemini-ді жұмыста және өмірде қалай қолдану, сұрауларды қалай жазу және жауаптарды қалай тексеру.',
    'yellow', 1
  ) returning id into c1;

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c1, 'Знакомство с ИИ', 'ЖИ-мен танысу', 1) returning id into m;

  insert into public.lessons (module_id, course_id, title_ru, title_kk, position, duration_min, content_ru, content_kk)
  values (m, c1, 'Что такое ИИ и нейросети', 'ЖИ және нейрожелілер дегеніміз не', 1, 15,
'## Что такое искусственный интеллект

Искусственный интеллект (ИИ) — это программы, которые умеют выполнять задачи, для которых обычно нужен человек: понимать текст, отвечать на вопросы, переводить, распознавать изображения.

### Что вы узнаете в этом уроке
- чем ИИ-ассистент отличается от поисковика;
- что умеют современные нейросети и чего они **не** умеют;
- почему ответы ИИ нужно проверять.

> Замените этот текст своим материалом в админке.',
'## Жасанды интеллект деген не

Жасанды интеллект (ЖИ) — әдетте адам орындайтын міндеттерді атқара алатын бағдарламалар: мәтінді түсіну, сұрақтарға жауап беру, аудару, суреттерді тану.

### Бұл сабақта не білесіз
- ЖИ-көмекшінің іздеу жүйесінен айырмашылығы;
- заманауи нейрожелілер не істей алады және не істей **алмайды**;
- ЖИ жауаптарын неге тексеру керек.

> Бұл мәтінді админкада өз материалыңызбен ауыстырыңыз.')
  returning id into l;

  insert into public.quiz_questions (lesson_id, question_ru, question_kk, options_ru, options_kk, position)
  values (l, 'Нужно ли проверять факты в ответах ИИ?', 'ЖИ жауаптарындағы фактілерді тексеру керек пе?',
          array['Нет, ИИ никогда не ошибается','Да, ИИ может ошибаться и придумывать факты','Только если ответ длинный'],
          array['Жоқ, ЖИ ешқашан қателеспейді','Иә, ЖИ қателесіп, фактілерді ойдан шығаруы мүмкін','Тек жауап ұзын болса'], 1)
  returning id into q;
  insert into public.quiz_answers values (q, 1);

  insert into public.lessons (module_id, course_id, title_ru, title_kk, position) values
    (m, c1, 'Обзор инструментов: ChatGPT, Claude, Gemini', 'Құралдарға шолу: ChatGPT, Claude, Gemini', 2),
    (m, c1, 'Регистрация и первые шаги', 'Тіркелу және алғашқы қадамдар', 3);

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c1, 'Как разговаривать с ИИ: промпты', 'ЖИ-мен қалай сөйлесу керек: промпттар', 2) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position, assignment_ru, assignment_kk) values
    (m, c1, 'Формула хорошего запроса', 'Жақсы сұрау формуласы', 1, '', ''),
    (m, c1, 'Роль, контекст, формат ответа', 'Рөл, контекст, жауап форматы', 2, '', ''),
    (m, c1, 'Практика: письма и тексты', 'Тәжірибе: хаттар мен мәтіндер', 3,
     'Попросите ИИ написать официальное письмо по вашей рабочей ситуации. Пришлите сюда ваш запрос и итоговый текст.',
     'ЖИ-ден өз жұмыс жағдайыңыз бойынша ресми хат жазуды сұраңыз. Мұнда сұрауыңыз бен қорытынды мәтінді жіберіңіз.');

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c1, 'ИИ в повседневной жизни', 'Күнделікті өмірдегі ЖИ', 3) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position) values
    (m, c1, 'Работа с документами и PDF', 'Құжаттармен және PDF-пен жұмыс', 1),
    (m, c1, 'Картинки и голос', 'Суреттер мен дауыс', 2),
    (m, c1, 'Безопасность и проверка фактов', 'Қауіпсіздік және фактілерді тексеру', 3);

  -- ================= Курс 2 =================
  insert into public.courses (title_ru, title_kk, description_ru, description_kk, theme, position)
  values (
    'ИИ для пресс-службы',
    'Баспасөз қызметіне арналған ЖИ',
    'Практический курс для сотрудников пресс-службы: пресс-релизы, посты для соцсетей, перевод RU↔KZ, визуал, расшифровка интервью и мониторинг СМИ с помощью ИИ.',
    'Баспасөз қызметі қызметкерлеріне арналған практикалық курс: баспасөз релиздері, әлеуметтік желілерге жазбалар, RU↔KZ аударма, визуал, сұхбатты транскрипциялау және ЖИ көмегімен БАҚ мониторингі.',
    'black', 2
  ) returning id into c2;

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c2, 'ИИ в работе пресс-службы', 'Баспасөз қызметі жұмысындағы ЖИ', 1) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position) values
    (m, c2, 'Возможности и ограничения', 'Мүмкіндіктер мен шектеулер', 1),
    (m, c2, 'Правила: конфиденциальность и этика', 'Ережелер: құпиялылық және этика', 2);

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c2, 'Тексты', 'Мәтіндер', 2) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position, assignment_ru, assignment_kk) values
    (m, c2, 'Пресс-релизы и новости', 'Баспасөз релиздері мен жаңалықтар', 1,
     'Подготовьте с помощью ИИ пресс-релиз о реальном событии вашей организации. Пришлите запрос и финальный текст после вашей редактуры.',
     'ЖИ көмегімен ұйымыңыздың нақты оқиғасы туралы баспасөз релизін дайындаңыз. Сұрауды және өңделген соңғы мәтінді жіберіңіз.'),
    (m, c2, 'Посты для соцсетей', 'Әлеуметтік желілерге арналған жазбалар', 2, '', ''),
    (m, c2, 'Перевод и адаптация RU ↔ KZ', 'Аударма және бейімдеу RU ↔ KZ', 3, '', '');

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c2, 'Визуал и мультимедиа', 'Визуал және мультимедиа', 3) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position) values
    (m, c2, 'Изображения и инфографика', 'Суреттер мен инфографика', 1),
    (m, c2, 'Видео, субтитры, расшифровка интервью', 'Бейне, субтитрлер, сұхбатты транскрипциялау', 2);

  insert into public.modules (course_id, title_ru, title_kk, position)
  values (c2, 'Аналитика', 'Талдау', 4) returning id into m;
  insert into public.lessons (module_id, course_id, title_ru, title_kk, position) values
    (m, c2, 'Мониторинг СМИ и отчёты', 'БАҚ мониторингі және есептер', 1);
end $$;

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
