-- =====================================================================
--  «AI для пресс-службы»: модуль «Уровень 1. База» — 2 занятия-игры,
--  как в курсе для начинающих (уровни, «Шаг 1/4», кнопка «Далее», звёзды).
--  Игры: public/slides/press-l1-game(-kk).html, press-l2-game(-kk).html
--  (собираются скриптом supabase/press-level1/games.py).
--  Модуль стоит ПЕРВЫМ в курсе (position = -1), остальные модули не трогает.
--  Повторный запуск безопасен. Лишние уроки этого модуля (позиции 3+ от прошлой
--  версии) удаляются.
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

  -- занятие 1
  select id into l from public.lessons where module_id = m and position = 1;
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, 1, 40, 'Занятие 1. Промты, референсы и Claude', '1-сабақ. Промттар, референстер және Claude',
            E'::game /slides/press-l1-game.html\n', E'::game /slides/press-l1-game-kk.html\n');
  else
    update public.lessons set duration_min = 40,
      title_ru = 'Занятие 1. Промты, референсы и Claude', title_kk = '1-сабақ. Промттар, референстер және Claude',
      content_ru = E'::game /slides/press-l1-game.html\n', content_kk = E'::game /slides/press-l1-game-kk.html\n',
      assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;

  -- занятие 2
  select id into l from public.lessons where module_id = m and position = 2;
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, 2, 50, 'Занятие 2. Скиллы, связка ИИ, лайфхаки и практика', '2-сабақ. Скиллдер, ЖИ байланысы, лайфхактар және практика',
            E'::game /slides/press-l2-game.html\n', E'::game /slides/press-l2-game-kk.html\n');
  else
    update public.lessons set duration_min = 50,
      title_ru = 'Занятие 2. Скиллы, связка ИИ, лайфхаки и практика', title_kk = '2-сабақ. Скиллдер, ЖИ байланысы, лайфхактар және практика',
      content_ru = E'::game /slides/press-l2-game.html\n', content_kk = E'::game /slides/press-l2-game-kk.html\n',
      assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;

  -- уроки прошлых версий этого модуля больше не нужны
  delete from public.lessons where module_id = m and position > 2;
end $$;

select l.position, l.title_ru, left(l.content_ru, 40) as content
from public.lessons l join public.modules m on m.id = l.module_id
where m.title_ru = 'Уровень 1. База' order by l.position;
