import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDict, pick } from '@/lib/i18n';
import { getCourseTree, getDoneSet, themeClasses } from '@/lib/courses';
import { IconCheck, IconPlay } from '@/components/Icons';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { lang, t } = await getDict();
  const { course, tree, flat } = await getCourseTree(supabase, id);
  if (!course) notFound();
  const done = await getDoneSet(supabase, profile.id);
  const d = flat.filter((l) => done.has(l.id)).length;
  const pct = flat.length ? Math.round((d / flat.length) * 100) : 0;
  const th = themeClasses[course.theme] ?? themeClasses.white;
  const next = flat.find((l) => !done.has(l.id)) ?? flat[0];
  let n = 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className={`rounded-3xl p-8 md:p-10 ${th.card}`}>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{pick(course, 'title', lang)}</h1>
        <p className={`mt-4 max-w-2xl ${th.sub}`}>{pick(course, 'description', lang)}</p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex justify-between text-sm font-semibold"><span>{t.progress}</span><span>{d}/{flat.length} · {pct}%</span></div>
            <div className={`h-1.5 rounded-full ${th.track}`}><div className={`h-1.5 rounded-full ${th.bar}`} style={{ width: `${pct}%` }} /></div>
          </div>
          {next && <Link href={`/lessons/${next.id}`} className={th.btn}><IconPlay className="h-4 w-4" />{d ? t.continue : t.start}</Link>}
        </div>
      </div>

      <div className="mt-10 space-y-8">
        {tree.map((m, mi) => (
          <section key={m.id}>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-mute">{t.module} {mi + 1}</div>
            <h2 className="mb-4 text-xl font-bold">{pick(m, 'title', lang)}</h2>
            <div className="card divide-y divide-line overflow-hidden">
              {m.lessons.map((l) => {
                n++;
                const isDone = done.has(l.id);
                return (
                  <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-canvas">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${isDone ? 'bg-brand' : 'bg-canvas text-ink-soft'}`}>
                      {isDone ? <IconCheck className="h-4 w-4" /> : n}
                    </span>
                    <span className="flex-1 text-sm font-semibold">{pick(l, 'title', lang)}</span>
                    <span className="flex gap-2 text-xs text-ink-mute">
                      {(l.video_url || l.video_path) && <span>▶</span>}
                      {l.assignment_ru && <span className="chip bg-brand-soft">{t.assignment}</span>}
                      {l.duration_min && <span>{l.duration_min} {t.min}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
