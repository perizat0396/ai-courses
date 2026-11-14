import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getDict, pick } from '@/lib/i18n';
import { getDoneSet, themeClasses } from '@/lib/courses';
import type { Course, Lesson, Submission } from '@/lib/types';
import { IconLock, IconPlay } from '@/components/Icons';

export default async function Dashboard() {
  const { supabase, profile } = await requireUser();
  const { lang, t } = await getDict();

  // Студент видит только курсы, к которым ему выдан доступ (RLS)
  const { data: enr } = await supabase.from('enrollments').select('course_id').eq('user_id', profile.id);
  const ids = (enr ?? []).map((e) => e.course_id);
  const { data: coursesRaw } = ids.length
    ? await supabase.from('courses').select('*').in('id', ids).eq('is_published', true).order('position')
    : { data: [] };
  const courses = (coursesRaw ?? []) as Course[];

  const { data: lessonsRaw } = courses.length
    ? await supabase.from('lessons').select('id,course_id,module_id,title_ru,title_kk,position,modules(position)').in('course_id', courses.map((c) => c.id))
    : { data: [] };
  type L = Pick<Lesson, 'id' | 'course_id' | 'title_ru' | 'title_kk' | 'position'> & { modules: { position: number } | null };
  const lessons = ((lessonsRaw ?? []) as unknown as L[]).sort(
    (a, b) => (a.modules?.position ?? 0) - (b.modules?.position ?? 0) || a.position - b.position,
  );
  const done = await getDoneSet(supabase, profile.id);

  const { data: subsRaw } = await supabase
    .from('submissions').select('*, lessons(title_ru,title_kk)').eq('user_id', profile.id).order('updated_at', { ascending: false }).limit(5);
  const subs = (subsRaw ?? []) as (Submission & { lessons: { title_ru: string; title_kk: string } })[];

  const firstName = (profile.full_name || '').split(' ')[0];
  const next = lessons.find((l) => !done.has(l.id));

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
      <section>
        <p className="text-lg font-medium text-ink-mute">{t.hello}{firstName ? `, ${firstName}` : ''}!</p>
        <h1 className="mt-1 text-3xl font-bold">{t.youHaveCourses(courses.length)} 📚</h1>

        {courses.length === 0 ? (
          <div className="card mt-10 flex flex-col items-start gap-4 p-8">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft"><IconLock /></div>
            <h2 className="text-xl font-bold">{t.noCourses}</h2>
            <p className="text-sm text-ink-soft">{t.noCoursesHint}</p>
            <code className="rounded-lg bg-canvas px-3 py-2 text-sm font-semibold">{profile.email}</code>
          </div>
        ) : (
          <>
            <h2 className="mb-5 mt-10 text-2xl font-bold">{t.dashboard}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {courses.map((c) => {
                const cl = lessons.filter((l) => l.course_id === c.id);
                const d = cl.filter((l) => done.has(l.id)).length;
                const pct = cl.length ? Math.round((d / cl.length) * 100) : 0;
                const th = themeClasses[c.theme] ?? themeClasses.white;
                const nextL = cl.find((l) => !done.has(l.id)) ?? cl[0];
                return (
                  <div key={c.id} className={`flex flex-col rounded-2xl p-6 ${th.card}`}>
                    <Link href={`/courses/${c.id}`} className="text-lg font-bold leading-snug hover:underline">{pick(c, 'title', lang)}</Link>
                    <p className={`mt-2 line-clamp-3 text-sm ${th.sub}`}>{pick(c, 'description', lang)}</p>
                    <div className="mt-auto pt-6">
                      <div className="mb-2 flex justify-between text-sm font-semibold">
                        <span>{t.progress}</span><span>{pct}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${th.track}`}>
                        <div className={`h-1.5 rounded-full ${th.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <span className={`text-xs font-semibold ${th.sub}`}>{d}/{cl.length} {t.lessons}</span>
                        {nextL && (
                          <Link href={`/lessons/${nextL.id}`} className={`${th.btn} btn-sm`}>
                            {d ? t.continue : t.start}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <aside className="space-y-6">
        {next && (
          <Link href={`/lessons/${next.id}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
            <div className="flex-1">
              <div className="text-sm font-bold">{t.continue}</div>
              <div className="mt-1 line-clamp-2 text-sm text-ink-soft">{pick(next, 'title', lang)}</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand"><IconPlay className="h-4 w-4" /></div>
          </Link>
        )}
        {subs.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-bold">{t.assignment}</h3>
            <ol className="relative space-y-4 border-l-2 border-brand pl-6">
              {subs.map((s) => (
                <li key={s.id} className="relative">
                  <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-brand bg-white" />
                  <Link href={`/lessons/${s.lesson_id}`} className={`block rounded-2xl p-4 ${s.status === 'needs_work' ? 'bg-brand' : 'bg-canvas'}`}>
                    <div className="text-sm font-bold">{pick(s.lessons, 'title', lang)}</div>
                    <div className="mt-1 text-xs font-semibold text-ink-soft">{t[`status_${s.status}`]}</div>
                    {s.feedback && <p className="mt-2 line-clamp-2 text-xs">{s.feedback}</p>}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}
