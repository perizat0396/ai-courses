import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { AccessToggle } from '@/components/admin/AccessToggle';
import { CreateStudentForm } from '@/components/admin/CreateStudentForm';

export default async function AdminStudents({ searchParams }: { searchParams: Promise<{ q?: string; course?: string }> }) {
  const { q = '', course = '' } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: courses }, { data: studentsRaw }, { data: enr }, { data: lessons }, { data: prog }] = await Promise.all([
    supabase.from('courses').select('id,title_ru').order('position'),
    supabase.from('profiles').select('id,email,full_name,role,created_at').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('user_id,course_id'),
    supabase.from('lessons').select('id,course_id'),
    supabase.from('lesson_progress').select('user_id,lesson_id'),
  ]);
  const has = new Set((enr ?? []).map((e) => `${e.user_id}:${e.course_id}`));
  const lessonCourse = new Map((lessons ?? []).map((l) => [l.id as string, l.course_id as string]));
  const totals = new Map<string, number>();
  (lessons ?? []).forEach((l) => totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1));
  const doneBy = new Map<string, number>();
  (prog ?? []).forEach((p) => { const k = `${p.user_id}:${lessonCourse.get(p.lesson_id)}`; doneBy.set(k, (doneBy.get(k) ?? 0) + 1); });

  const needle = q.trim().toLowerCase();
  const students = (studentsRaw ?? []).filter((s) =>
    s.role === 'student' &&
    (!needle || `${s.full_name} ${s.email}`.toLowerCase().includes(needle)) &&
    (!course || has.has(`${s.id}:${course}`)),
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <section className="min-w-0 space-y-6">
        <h1 className="h1">Студенты</h1>
        <form className="flex flex-wrap gap-3">
          <input name="q" defaultValue={q} placeholder="Поиск по имени или email…" className="input max-w-sm flex-1" />
          <select name="course" defaultValue={course} className="input w-auto">
            <option value="">Все студенты</option>
            {(courses ?? []).map((c) => <option key={c.id} value={c.id}>С доступом: {c.title_ru}</option>)}
          </select>
          <button className="btn-dark">Найти</button>
          {(q || course) && <Link href="/admin/students" className="btn-ghost">Сбросить</Link>}
        </form>
        <p className="text-xs text-ink-soft">Нажмите на курс рядом со студентом, чтобы открыть (чёрный) или закрыть (белый) доступ. Цифры — пройдено уроков.</p>
        <div className="card divide-y divide-line">
          {students.length === 0 && <p className="p-6 text-sm text-ink-mute">Никого не найдено</p>}
          {students.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold">
                {(s.full_name || s.email || '?').split(/\s+/).map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-48 flex-1">
                <div className="text-sm font-bold">{s.full_name || '—'}</div>
                <div className="text-xs text-ink-mute">{s.email} · {new Date(s.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(courses ?? []).map((c) => {
                  const on = has.has(`${s.id}:${c.id}`);
                  const d = doneBy.get(`${s.id}:${c.id}`) ?? 0;
                  return <AccessToggle key={c.id} userId={s.id} courseId={c.id} on={on} label={on ? `${c.title_ru} · ${d}/${totals.get(c.id) ?? 0}` : c.title_ru} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside><CreateStudentForm courses={(courses ?? []).map((c) => ({ id: c.id, title: c.title_ru }))} /></aside>
    </div>
  );
}
