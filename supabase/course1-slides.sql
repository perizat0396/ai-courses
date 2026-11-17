-- Встраивает HTML-презентацию (public/slides/m1-l1.html) в начало первого занятия курса
-- «Искусственный интеллект для начинающих». Повторный запуск ничего не дублирует.
update public.lessons l
set content_ru = '::slides /slides/m1-l1.html' || E'\n\n' || coalesce(l.content_ru, ''),
    content_kk = '::slides /slides/m1-l1.html' || E'\n\n' || coalesce(l.content_kk, '')
from public.modules m
join public.courses c on c.id = m.course_id
where l.module_id = m.id
  and c.title_ru = 'Искусственный интеллект для начинающих'
  and m.position = (select min(m2.position) from public.modules m2 where m2.course_id = c.id)
  and l.position = (select min(l2.position) from public.lessons l2 where l2.module_id = m.id)
  and coalesce(l.content_ru, '') not like '%::slides /slides/m1-l1.html%';

select l.title_ru, left(l.content_ru, 60) as starts_with
from public.lessons l join public.courses c on c.id = l.course_id
where c.title_ru = 'Искусственный интеллект для начинающих' and l.content_ru like '::slides%';
