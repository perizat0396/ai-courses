-- Телефоны без фона, сбоку от текста (RU/KZ).
update public.lessons set
  content_ru = replace(replace(content_ru,
    '/lessons/m1/ru/whatsapp.jpg)', '/lessons/m1/ru/whatsapp.png "side")'),
    '/lessons/m1/ru/hello.jpg)', '/lessons/m1/ru/hello.png "side")'),
  content_kk = replace(replace(content_kk,
    '/lessons/m1/kk/whatsapp.jpg)', '/lessons/m1/kk/whatsapp.png "side")'),
    '/lessons/m1/kk/hello.jpg)', '/lessons/m1/kk/hello.png "side")')
where content_ru like '%/lessons/m1/%';

select title_ru, (length(content_ru) - length(replace(content_ru, '"side"', ''))) / 6 as side_ru,
       (length(content_kk) - length(replace(content_kk, '"side"', ''))) / 6 as side_kk
from public.lessons where content_ru like '%/lessons/m1/%';
