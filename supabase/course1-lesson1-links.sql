-- Занятие 1: ссылки на сайты помощников в таблице и без теста.
update public.lessons set
  content_ru = replace(replace(replace(content_ru,
    '| ChatGPT | OpenAI', '| [ChatGPT](https://chatgpt.com) | OpenAI'),
    '| Gemini | Google', '| [Gemini](https://gemini.google.com) | Google'),
    '| Meta AI | Meta', '| [Meta AI](https://www.meta.ai) | Meta'),
  content_kk = replace(replace(replace(content_kk,
    '| ChatGPT | OpenAI', '| [ChatGPT](https://chatgpt.com) | OpenAI'),
    '| Gemini | Google', '| [Gemini](https://gemini.google.com) | Google'),
    '| Meta AI | Meta', '| [Meta AI](https://www.meta.ai) | Meta')
where content_ru like '::slides /slides/m1-l1.html%' and content_ru not like '%[ChatGPT](https://chatgpt.com)%';

delete from public.quiz_questions
where lesson_id = (select id from public.lessons where content_ru like '::slides /slides/m1-l1.html%' limit 1);

select title_ru, (select count(*) from public.quiz_questions q where q.lesson_id = l.id) as quiz,
       position('[ChatGPT](https://chatgpt.com)' in content_ru) > 0 as ru_links,
       position('[ChatGPT](https://chatgpt.com)' in content_kk) > 0 as kk_links
from public.lessons l where content_ru like '::slides /slides/m1-l1.html%';
