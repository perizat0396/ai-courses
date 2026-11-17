-- Иллюстрации (кадры из презентации) в тексте занятия 1 и практики, RU/KZ.
update public.lessons set content_ru = replace(replace(replace(replace(content_ru, $q$## Самые известные ИИ-помощники
$q$, $q$## Самые известные ИИ-помощники

![ИИ-помощники](/lessons/m1/ru/helpers.jpg)
$q$), $q$## Как просить ИИ
$q$, $q$## Как просить ИИ

![Четыре вопроса хорошей просьбы](/lessons/m1/ru/formula.jpg)

![Сравнение двух просьб](/lessons/m1/ru/compare.jpg)
$q$), $q$> **Два правила безопасности.**$q$, $q$![Два правила безопасности](/lessons/m1/ru/safety.jpg)

> **Два правила безопасности.**$q$), $q$## Практика: Meta AI в WhatsApp
$q$, $q$## Практика: Meta AI в WhatsApp

![Meta AI в WhatsApp](/lessons/m1/ru/whatsapp.jpg)
$q$), content_kk = replace(replace(replace(replace(content_kk, $q$## Ең танымал ЖИ көмекшілері
$q$, $q$## Ең танымал ЖИ көмекшілері

![ЖИ көмекшілері](/lessons/m1/kk/helpers.jpg)
$q$), $q$## ЖИ-ден қалай сұрау керек
$q$, $q$## ЖИ-ден қалай сұрау керек

![Жақсы промпттың төрт сұрағы](/lessons/m1/kk/formula.jpg)

![Екі өтінішті салыстыру](/lessons/m1/kk/compare.jpg)
$q$), $q$> **Екі қауіпсіздік ережесі.**$q$, $q$![Екі қауіпсіздік ережесі](/lessons/m1/kk/safety.jpg)

> **Екі қауіпсіздік ережесі.**$q$), $q$## Практика: WhatsApp-тағы Meta AI
$q$, $q$## Практика: WhatsApp-тағы Meta AI

![WhatsApp-тағы Meta AI](/lessons/m1/kk/whatsapp.jpg)
$q$)
where id = '6eb9e33f-d5b1-4ad7-ba05-a29b03992d30' and content_ru not like '%/lessons/m1/%';
update public.lessons set content_ru = replace(replace(replace(replace(content_ru, $q$## Шаг 1. Найдите Meta AI
$q$, $q$## Шаг 1. Найдите Meta AI

![Где найти Meta AI в WhatsApp](/lessons/m1/ru/whatsapp.jpg)
$q$), $q$## Шаг 2. Скажите «Привет!»
$q$, $q$## Шаг 2. Скажите «Привет!»

![Первый разговор с Meta AI](/lessons/m1/ru/hello.jpg)
$q$), $q$## Шаг 4. Выберите одно задание
$q$, $q$## Шаг 4. Выберите одно задание

![Задания на выбор](/lessons/m1/ru/tasks.jpg)
$q$), $q$## Шаг 6. Добавьте подробности — 7 минут
$q$, $q$## Шаг 6. Добавьте подробности — 7 минут

![Четыре вопроса хорошей просьбы](/lessons/m1/ru/formula.jpg)
$q$), content_kk = replace(replace(replace(replace(content_kk, $q$## 1-қадам. Meta AI-ды табыңыз
$q$, $q$## 1-қадам. Meta AI-ды табыңыз

![WhatsApp-та Meta AI-ды табу](/lessons/m1/kk/whatsapp.jpg)
$q$), $q$## 2-қадам. «Сәлем!» деп жазыңыз
$q$, $q$## 2-қадам. «Сәлем!» деп жазыңыз

![Meta AI-мен алғашқы әңгіме](/lessons/m1/kk/hello.jpg)
$q$), $q$## 4-қадам. Бір тапсырманы таңдаңыз
$q$, $q$## 4-қадам. Бір тапсырманы таңдаңыз

![Таңдауға арналған тапсырмалар](/lessons/m1/kk/tasks.jpg)
$q$), $q$## 6-қадам. Толық ақпарат қосыңыз — 7 минут
$q$, $q$## 6-қадам. Толық ақпарат қосыңыз — 7 минут

![Жақсы промпттың төрт сұрағы](/lessons/m1/kk/formula.jpg)
$q$)
where id = 'a798eb4b-5c08-4a79-b02f-7aaf35b3f880' and content_ru not like '%/lessons/m1/%';
select title_ru,
  (length(content_ru) - length(replace(content_ru, '/lessons/m1/', ''))) / 12 as img_ru,
  (length(content_kk) - length(replace(content_kk, '/lessons/m1/', ''))) / 12 as img_kk
from public.lessons where id in ('6eb9e33f-d5b1-4ad7-ba05-a29b03992d30','a798eb4b-5c08-4a79-b02f-7aaf35b3f880');
