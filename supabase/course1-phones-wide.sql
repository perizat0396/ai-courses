-- Телефон со списком чатов (с подсказками) — крупнее.
update public.lessons set
  content_ru = replace(content_ru, 'whatsapp.png "side")', 'whatsapp.png "side-wide")'),
  content_kk = replace(content_kk, 'whatsapp.png "side")', 'whatsapp.png "side-wide")')
where content_ru like '%whatsapp.png "side")%';
select title_ru, position('side-wide' in content_ru) > 0 as ru, position('side-wide' in content_kk) > 0 as kk from public.lessons where content_ru like '%/lessons/m1/%';
