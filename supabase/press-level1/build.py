"""Собирает supabase/press-level1.sql из ru.md и kk.md.
Формат: «=== Название урока | минуты», шаги разделяются строкой «::step»."""
import pathlib, re
d = pathlib.Path(__file__).parent
def parse(f):
    out = []
    for block in re.split(r'^=== ', (d / f).read_text(), flags=re.M)[1:]:
        head, body = block.split('\n', 1)
        title, mins = [x.strip() for x in head.split('|')]
        out.append((title, int(mins), body.strip() + '\n'))
    return out
ru, kk = parse('ru.md'), parse('kk.md')
assert len(ru) == len(kk), (len(ru), len(kk))
sql = ['''-- =====================================================================
--  «AI для пресс-службы»: модуль «Уровень 1. База» — микрокурс по шагам
--  (один экран — одна мысль, кнопка «Далее»; шаги — строки «::step»).
--  Ставится ПЕРВЫМ модулем курса (position = -1), остальные модули не трогает.
--  Собрано из supabase/press-level1/{ru,kk}.md скриптом build.py — правьте .md.
--  Повторный запуск безопасен: уроки обновляются, прогресс сохраняется.
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
''']
for i, ((tr, mins, br), (tk, _, bk)) in enumerate(zip(ru, kk), 1):
    assert br.count('::step') == bk.count('::step'), (tr, br.count('::step'), bk.count('::step'))
    assert '$t$' not in br + bk
    sql.append(f'''
  -- урок {i}: {tr} ({br.count('::step')} шагов)
  select id into l from public.lessons where module_id = m and position = {i};
  if l is null then
    insert into public.lessons (module_id, course_id, position, duration_min, title_ru, title_kk, content_ru, content_kk)
    values (m, c, {i}, {mins}, $t${tr}$t$, $t${tk}$t$, $t${br}$t$, $t${bk}$t$);
  else
    update public.lessons set duration_min = {mins}, title_ru = $t${tr}$t$, title_kk = $t${tk}$t$,
      content_ru = $t${br}$t$, content_kk = $t${bk}$t$, assignment_ru = '', assignment_kk = ''
    where id = l;
  end if;
''')
sql.append('end $$;\n')
(d.parent / 'press-level1.sql').write_text(''.join(sql))
print('ok', [(t, b.count('::step')) for t, _, b in ru])
