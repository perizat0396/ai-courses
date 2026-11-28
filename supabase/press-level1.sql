-- =====================================================================
--  «AI для пресс-службы»: модуль «Уровень 1. База» — 3 занятия-игры
--  (уровни, «Шаг 1/4», кнопка «Далее», звёзды; без тестов).
--  Игры собираются скриптом supabase/press-level1/games.py.
--  Модуль первым в курсе (position = -1). Повторный запуск безопасен.
--  Уроки этого модуля с позицией 4+ удаляются.
-- =====================================================================
do $$
declare c uuid; m uuid; l uuid;
begin
  select id into c from public.courses where title_ru in ('AI для пресс-службы','ИИ для пресс-службы') order by created_at limit 1;
  if c is null then raise exception 'Курс «AI для пресс-службы» не найден'; end if;
  select id into m from public.modules where course_id = c and title_ru = 'Уровень 1. База';
  if m is null then
    insert into public.modules (course_id, title_ru, title_kk, position)
    values (c, 'Уровень 1. База', '1-деңгей. Негіз', -1) returning id into m;
  end if;

  select id into l from public.lessons where module_id = m and position = 1;
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, 1, 20, 'Занятие 1. Промты и референсы', '1-сабақ. Промттар мен референстер', E'::game /slides/press-l1-game.html\n', E'::game /slides/press-l1-game-kk.html\n');
  else
    update public.lessons set duration_min = 20, title_ru = 'Занятие 1. Промты и референсы', title_kk = '1-сабақ. Промттар мен референстер',
      content_ru = E'::game /slides/press-l1-game.html\n', content_kk = E'::game /slides/press-l1-game-kk.html\n', assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;

  select id into l from public.lessons where module_id = m and position = 2;
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, 2, 45, 'Занятие 2. Claude от А до Я', '2-сабақ. Claude А-дан Я-ға дейін', E'::game /slides/press-claude-game.html\n', E'::game /slides/press-claude-game-kk.html\n');
  else
    update public.lessons set duration_min = 45, title_ru = 'Занятие 2. Claude от А до Я', title_kk = '2-сабақ. Claude А-дан Я-ға дейін',
      content_ru = E'::game /slides/press-claude-game.html\n', content_kk = E'::game /slides/press-claude-game-kk.html\n', assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;

  select id into l from public.lessons where module_id = m and position = 3;
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, 3, 45, 'Занятие 3. Связка ИИ, лайфхаки и практика', '3-сабақ. ЖИ байланысы, лайфхактар және практика', E'::game /slides/press-l3-game.html\n', E'::game /slides/press-l3-game-kk.html\n');
  else
    update public.lessons set duration_min = 45, title_ru = 'Занятие 3. Связка ИИ, лайфхаки и практика', title_kk = '3-сабақ. ЖИ байланысы, лайфхактар және практика',
      content_ru = E'::game /slides/press-l3-game.html\n', content_kk = E'::game /slides/press-l3-game-kk.html\n', assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;

  delete from public.lessons where module_id = m and position > 3;
end $$;
