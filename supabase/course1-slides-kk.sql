-- Казахская страница первого занятия показывает казахскую версию презентации.
update public.lessons
set content_kk = replace(content_kk, '::slides /slides/m1-l1.html', '::slides /slides/m1-l1-kk.html')
where content_kk like '%::slides /slides/m1-l1.html%';

select title_kk, left(content_kk, 50) as starts_with from public.lessons where content_kk like '::slides%';
