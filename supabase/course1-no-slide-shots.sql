-- Убираем скриншоты слайдов из текста уроков (остаются только телефоны сбоку): helpers, formula, compare, safety, tasks.
update public.lessons set
  content_ru = regexp_replace(content_ru, '!\[[^\]]*\]\(/lessons/m1/ru/(helpers|formula|compare|safety|tasks)\.jpg\)\n\n?', '', 'g'),
  content_kk = regexp_replace(content_kk, '!\[[^\]]*\]\(/lessons/m1/kk/(helpers|formula|compare|safety|tasks)\.jpg\)\n\n?', '', 'g')
where id in ('6eb9e33f-d5b1-4ad7-ba05-a29b03992d30', 'a798eb4b-5c08-4a79-b02f-7aaf35b3f880');

select title_ru,
  (length(content_ru) - length(replace(content_ru, '/lessons/m1/', ''))) / 12 as img_ru,
  (length(content_kk) - length(replace(content_kk, '/lessons/m1/', ''))) / 12 as img_kk
from public.lessons where id in ('6eb9e33f-d5b1-4ad7-ba05-a29b03992d30', 'a798eb4b-5c08-4a79-b02f-7aaf35b3f880');
