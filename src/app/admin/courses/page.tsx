import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createCourse } from '../actions';
import { themeClasses } from '@/lib/courses';
import type { Course } from '@/lib/types';

export default async function AdminCourses() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('courses').select('*, lessons(count), enrollments(count)').order('position');
  const courses = (data ?? []) as (Course & { lessons: { count: number }[]; enrollments: { count: number }[] })[];
  return (
    <div className="space-y-8">
      <h1 className="h1">Курсы</h1>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => {
          const th = themeClasses[c.theme] ?? themeClasses.white;
          return (
            <Link key={c.id} href={`/admin/courses/${c.id}`} className={`flex min-h-48 flex-col rounded-2xl p-6 transition hover:-translate-y-0.5 ${th.card}`}>
              <span className={`chip mb-3 w-fit ${c.is_published ? 'bg-white text-ink' : 'bg-ink/10'}`}>{c.is_published ? 'Опубликован' : 'Черновик'}</span>
              <div className="text-lg font-bold leading-snug">{c.title_ru}</div>
              {c.title_kk && <div className={`mt-1 text-sm ${th.sub}`}>{c.title_kk}</div>}
              <div className={`mt-auto pt-6 text-xs font-semibold ${th.sub}`}>
                {c.lessons?.[0]?.count ?? 0} уроков · {c.enrollments?.[0]?.count ?? 0} студентов с доступом
              </div>
            </Link>
          );
        })}
        <form action={createCourse} className="card flex flex-col gap-3 border-2 border-dashed p-6 shadow-none">
          <div className="text-lg font-bold">Новый курс</div>
          <input name="title_ru" placeholder="Название (рус.)" required className="input" />
          <input name="title_kk" placeholder="Атауы (қаз.)" className="input" />
          <button className="btn-dark mt-auto">+ Создать</button>
        </form>
      </div>
    </div>
  );
}
