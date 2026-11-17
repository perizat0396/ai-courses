import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { adminLang } from '@/lib/admin-lang';
import { createCourse } from '../actions';
import { themeClasses } from '@/lib/courses';
import type { Course } from '@/lib/types';

export default async function AdminCourses() {
  const { supabase } = await requireAdmin();
  const { L, T } = await adminLang();
  const { data } = await supabase.from('courses').select('*, lessons(count), enrollments(count)').order('position');
  const courses = (data ?? []) as (Course & { lessons: { count: number }[]; enrollments: { count: number }[] })[];
  return (
    <div className="space-y-8">
      <h1 className="h1">{L('Курсы', 'Курстар')}</h1>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => {
          const th = themeClasses[c.theme] ?? themeClasses.white;
          return (
            <Link key={c.id} href={`/admin/courses/${c.id}`} className={`flex min-h-48 flex-col rounded-2xl p-6 transition hover:-translate-y-0.5 ${th.card}`}>
              <span className={`chip mb-3 w-fit ${c.is_published ? 'bg-white text-ink' : 'bg-ink/10'}`}>{c.is_published ? L('Опубликован', 'Жарияланды') : L('Черновик', 'Жоба')}</span>
              <div className="text-lg font-bold leading-snug">{T(c)}</div>
              <div className={`mt-auto pt-6 text-xs font-semibold ${th.sub}`}>
                {c.lessons?.[0]?.count ?? 0} {L('уроков', 'сабақ')} · {c.enrollments?.[0]?.count ?? 0} {L('студентов с доступом', 'студентте қолжетімділік бар')}
              </div>
            </Link>
          );
        })}
        <form action={createCourse} className="card flex flex-col gap-3 border-2 border-dashed p-6 shadow-none">
          <div className="text-lg font-bold">{L('Новый курс', 'Жаңа курс')}</div>
          <input name="title_ru" placeholder={L('Название (рус.)', 'Атауы (орыс.)')} required className="input" />
          <input name="title_kk" placeholder={L('Название (каз.)', 'Атауы (қаз.)')} className="input" />
          <button className="btn-dark mt-auto">{L('+ Создать', '+ Құру')}</button>
        </form>
      </div>
    </div>
  );
}
