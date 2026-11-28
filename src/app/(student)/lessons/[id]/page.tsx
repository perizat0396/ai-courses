import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDict, pick, pickArr } from '@/lib/i18n';
import { getCourseTree, getDoneSet } from '@/lib/courses';
import type { LessonFile, QuizQuestion, Submission } from '@/lib/types';
import { Video } from '@/components/Video';
import { Markdown } from '@/components/Markdown';
import { Quiz } from '@/components/Quiz';
import { Assignment } from '@/components/Assignment';
import { DoneButton } from '@/components/DoneButton';
import { AiChat } from '@/components/AiChat';
import { aiStudentEnabled } from '@/lib/gemini';
import { IconArrowL, IconArrowR, IconCheck, IconFile } from '@/components/Icons';

function fmtSize(b: number | null) {
  if (!b) return '';
  return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { lang, t } = await getDict();

  const { data: lessonRow } = await supabase.from('lessons').select('course_id').eq('id', id).maybeSingle();
  if (!lessonRow) notFound(); // нет урока или нет доступа (RLS)

  const { course, tree, flat } = await getCourseTree(supabase, lessonRow.course_id, profile.role !== 'admin');
  const lesson = flat.find((l) => l.id === id);
  if (!course || !lesson) notFound();
  const idx = flat.findIndex((l) => l.id === id);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const mod = tree.find((m) => m.id === lesson.module_id);

  const [done, { data: filesRaw }, { data: qRaw }, { data: attempt }, { data: subRaw }] = await Promise.all([
    getDoneSet(supabase, profile.id),
    supabase.from('lesson_files').select('*').eq('lesson_id', id).order('created_at'),
    supabase.from('quiz_questions').select('*').eq('lesson_id', id).order('position').order('id'),
    supabase.from('quiz_attempts').select('score,total').eq('lesson_id', id).eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('submissions').select('*').eq('lesson_id', id).eq('user_id', profile.id).maybeSingle(),
  ]);

  const files = (filesRaw ?? []) as LessonFile[];
  const fileLinks = await Promise.all(
    files.map(async (f) => {
      const { data } = await supabase.storage.from('lesson-files').createSignedUrl(f.path, 3600, { download: f.name });
      return { ...f, url: data?.signedUrl ?? '#' };
    }),
  );

  let videoUrl = lesson.video_url || '';
  if (lesson.video_path) {
    const { data } = await supabase.storage.from('lesson-files').createSignedUrl(lesson.video_path, 60 * 60 * 4);
    videoUrl = data?.signedUrl ?? videoUrl;
  }

  const questions = ((qRaw ?? []) as QuizQuestion[]).map((q) => ({
    id: q.id, question: pick(q, 'question', lang), options: pickArr(q, 'options', lang),
  }));

  const sub = subRaw as Submission | null;
  let subFile: { url: string | null; name: string | null } = { url: null, name: null };
  if (sub?.file_path) {
    const { data } = await supabase.storage.from('submissions').createSignedUrl(sub.file_path, 3600);
    subFile = { url: data?.signedUrl ?? null, name: sub.file_path.split('/').pop()?.replace(/^\d+_/, '') ?? null };
  }

  const content = pick(lesson, 'content', lang);
  const task = pick(lesson, 'assignment', lang);
  const isDone = done.has(id);

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_300px]">
      <article className="min-w-0">
        <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
          <IconArrowL className="h-4 w-4" /> {pick(course, 'title', lang)}
        </Link>
        <div className="mt-4 text-xs font-bold uppercase tracking-wider text-brand-dark">
          {mod && pick(mod, 'title', lang)} · {t.lesson} {idx + 1}/{flat.length}
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight">{pick(lesson, 'title', lang)}</h1>

        <div className="mt-8 space-y-8">
          {videoUrl && <Video url={videoUrl} />}
          {content && <Markdown lang={lang} stepKey={`${id}:${lang}`}>{content}</Markdown>}

          {fileLinks.length > 0 && (
            <div>
              <h3 className="mb-3 text-xl font-bold">{t.materials}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fileLinks.map((f) => (
                  <a key={f.id} href={f.url} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft"><IconFile /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.name}</span>
                      <span className="text-xs text-ink-mute">{fmtSize(f.size)} · {t.download}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <Quiz lessonId={id} questions={questions} last={attempt}
              labels={{ quiz: t.quiz, check: t.checkAnswers, again: t.tryAgain, result: t.result }} />
          )}

          {task && (
            <Assignment lessonId={id} userId={profile.id} task={task}
              ai={aiStudentEnabled()}
              sub={sub ? { body: sub.body, status: sub.status, feedback: sub.feedback, ai_feedback: sub.ai_feedback ?? '', file_url: subFile.url, file_name: subFile.name } : null}
              labels={{
                assignment: t.assignment, yourAnswer: t.yourAnswer, attach: t.attachFile, send: t.send, sent: t.sent,
                feedback: t.teacherFeedback, status: sub ? t[`status_${sub.status}`] : '',
                aiReview: t.aiReview, aiReviewNote: t.aiReviewNote, aiChecking: t.aiChecking, aiRecheck: t.aiRecheck,
              }} />
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          {prev ? <Link href={`/lessons/${prev.id}`} className="btn-ghost"><IconArrowL className="h-4 w-4" />{t.prev}</Link> : <span />}
          <DoneButton lessonId={id} done={isDone} labels={{ mark: t.markDone, done: t.done }} />
          {next ? <Link href={`/lessons/${next.id}`} className="btn-brand">{t.next}<IconArrowR className="h-4 w-4" /></Link> : <span />}
        </div>
      </article>

      {aiStudentEnabled() && (
        <AiChat lessonId={id} labels={{
          title: t.aiHelper, hello: t.aiHello, placeholder: t.aiPlaceholder, thinking: t.aiThinking,
          note: t.aiNote, quick: task ? [t.aiQuick1, t.aiQuick2, t.aiQuick3] : [t.aiQuick1, t.aiQuick2], send: t.send,
        }} />
      )}

      <aside className="hidden xl:block">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {tree.map((m) => (
            <div key={m.id} className="mb-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-mute">{pick(m, 'title', lang)}</div>
              <ul className="space-y-1 border-l-2 border-line">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`}
                      className={`-ml-0.5 flex items-start gap-2 border-l-2 py-1.5 pl-4 text-sm ${
                        l.id === id ? 'border-brand font-bold' : 'border-transparent text-ink-soft hover:text-ink'
                      }`}>
                      <span className="flex-1">{pick(l, 'title', lang)}</span>
                      {done.has(l.id) && <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
