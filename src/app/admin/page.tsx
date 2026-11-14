import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { AccessToggle } from '@/components/admin/AccessToggle';

export default async function AdminHome() {
  const { supabase, profile } = await requireAdmin();
  const [{ data: courses }, { data: students }, { data: enr }, { count: pending }] = await Promise.all([
    supabase.from('courses').select('id,title_ru,is_published').order('position'),
    supabase.from('profiles').select('id,email,full_name,created_at').eq('role', 'student').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('user_id,course_id'),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
  ]);
  const enrolled = new Set((enr ?? []).map((e) => e.user_id));
  const waiting = (students ?? []).filter((s) => !enrolled.has(s.id)).slice(0, 10);
  const perCourse = (cid: string) => (enr ?? []).filter((e) => e.course_id === cid).length;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-lg font-medium text-ink-mute">Здравствуйте, {profile.full_name.split(' ')[0] || 'админ'}!</p>
        <h1 className="mt-1 text-3xl font-bold">Панель управления</h1>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Link href="/admin/students" className="rounded-2xl bg-brand p-6">
          <div className="text-4xl font-extrabold">{students?.length ?? 0}</div>
          <div className="mt-1 text-sm font-semibold">студентов</div>
        </Link>
        <Link href="/admin/courses" className="rounded-2xl bg-ink p-6 text-white">
          <div className="text-4xl font-extrabold">{courses?.length ?? 0}</div>
          <div className="mt-1 text-sm font-semibold text-white/60">курсов</div>
        </Link>
        <Link href="/admin/submissions" className="card p-6">
          <div className="text-4xl font-extrabold">{pending ?? 0}</div>
          <div className="mt-1 text-sm font-semibold text-ink-soft">заданий ждут проверки</div>
        </Link>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-bold">Ждут доступа</h2>
          {waiting.length === 0 ? (
            <p className="card p-6 text-sm text-ink-soft">Все зарегистрированные студенты получили доступ хотя бы к одному курсу.</p>
          ) : (
            <div className="card divide-y divide-line">
              {waiting.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{s.full_name || '—'}</div>
                    <div className="truncate text-xs text-ink-mute">{s.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(courses ?? []).map((c) => <AccessToggle key={c.id} userId={s.id} courseId={c.id} on={false} label={c.title_ru} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Курсы</h2>
          <div className="card divide-y divide-line">
            {(courses ?? []).map((c) => (
              <Link key={c.id} href={`/admin/courses/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-canvas">
                <span className="flex-1 text-sm font-bold">{c.title_ru}</span>
                <span className="text-xs text-ink-soft">{perCourse(c.id)} студ.</span>
                <span className={`chip ${c.is_published ? 'bg-brand' : 'bg-canvas text-ink-soft'}`}>{c.is_published ? 'Опубликован' : 'Черновик'}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
