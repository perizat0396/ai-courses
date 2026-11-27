import { isDraft, stripDraft } from '@/lib/draft';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { adminLang } from '@/lib/admin-lang';
import type { Lesson, LessonFile, Module, QuizQuestion } from '@/lib/types';
import { addQuestion, deleteLesson, deleteLessonFile, deleteQuestion, updateLesson } from '../../actions';
import { Bilingual } from '@/components/admin/Bilingual';
import { FileUploader, VideoUploader } from '@/components/admin/Uploader';
import { ConfirmButton } from '@/components/admin/Confirm';
import { IconArrowL, IconFile, IconTrash } from '@/components/Icons';

export default async function AdminLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { kk, L, T } = await adminLang();
  const { data: lessonRaw } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
  if (!lessonRaw) notFound();
  const lesson = lessonRaw as Lesson;
  const [{ data: course }, { data: modules }, { data: files }, { data: qs }, { data: answers }] = await Promise.all([
    supabase.from('courses').select('id,title_ru,title_kk').eq('id', lesson.course_id).single(),
    supabase.from('modules').select('*').eq('course_id', lesson.course_id).order('position'),
    supabase.from('lesson_files').select('*').eq('lesson_id', id).order('created_at'),
    supabase.from('quiz_questions').select('*').eq('lesson_id', id).order('position').order('id'),
    supabase.from('quiz_answers').select('*'),
  ]);
  const correct = new Map((answers ?? []).map((a) => [a.question_id as string, a.correct_index as number]));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href={`/admin/courses/${lesson.course_id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
          <IconArrowL className="h-4 w-4" />{T(course)}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="h1 flex-1">{T(lesson)}</h1>
          <Link href={`/lessons/${id}`} className="btn-ghost btn-sm">{L('Как видит студент', 'Студент қалай көреді')}</Link>
        </div>
      </div>

      <form action={updateLesson.bind(null, id)} className="card space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label">{L('Название (рус.)', 'Атауы (орыс.)')}</label><input name="title_ru" defaultValue={lesson.title_ru} required className="input" /></div>
          <div><label className="label">{L('Название (каз.)', 'Атауы (қаз.)')}</label><input name="title_kk" defaultValue={lesson.title_kk} className="input" /></div>
          <div>
            <label className="label">{L('Модуль', 'Модуль')}</label>
            <select name="module_id" defaultValue={lesson.module_id} className="input">
              {((modules ?? []) as Module[]).map((m) => <option key={m.id} value={m.id}>{T(m)}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 font-semibold md:col-span-2"><input type="checkbox" name="hidden" defaultChecked={isDraft(lesson)} className="h-5 w-5" /> {L('Скрыть урок от студентов (черновик)', 'Сабақты студенттерден жасыру (жоба)')}</label>
          <div><label className="label">{L('Длительность, мин', 'Ұзақтығы, мин')}</label><input name="duration_min" type="number" min={0} defaultValue={lesson.duration_min ?? ''} className="input" /></div>
        </div>

        <div className="rounded-xl bg-canvas p-4">
          <label className="label">{L('Видео: ссылка YouTube / Vimeo / Google Drive / .mp4', 'Бейне: YouTube / Vimeo / Google Drive / .mp4 сілтемесі')}</label>
          <input name="video_url" defaultValue={lesson.video_url ?? ''} placeholder="https://youtu.be/..." className="input bg-white" />
          <p className="mt-2 text-xs text-ink-mute">{L('Совет: на YouTube выбирайте «Доступ по ссылке» — видео не будет в поиске. Загруженный файл (ниже) важнее ссылки.', 'Кеңес: YouTube-та «Сілтеме арқылы қолжетімді» таңдаңыз — бейне іздеуде шықпайды. Жүктелген файл (төменде) сілтемеден маңыздырақ.')}</p>
          <div className="mt-3"><VideoUploader lessonId={id} current={lesson.video_path} kk={kk} /></div>
        </div>

        <Bilingual name="content" label={L('Текст урока', 'Сабақ мәтіні')} uiKk={kk} ru={stripDraft(lesson.content_ru)} kk={lesson.content_kk} rows={16}
          hint={L('Markdown: ## заголовок, **жирный**, - список, ![](ссылка на картинку)', 'Markdown: ## тақырып, **қалың**, - тізім, ![](сурет сілтемесі)')} />
        <Bilingual name="assignment" label={L('Задание (пусто — без задания)', 'Тапсырма (бос болса — тапсырмасыз)')} uiKk={kk} ru={lesson.assignment_ru} kk={lesson.assignment_kk} rows={5} />

        <div className="flex justify-end"><button className="btn-dark">{L('Сохранить урок', 'Сабақты сақтау')}</button></div>
      </form>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{L('Файлы для скачивания', 'Жүктеуге арналған файлдар')}</h2>
          <FileUploader lessonId={id} kk={kk} />
        </div>
        {((files ?? []) as LessonFile[]).length === 0 ? <p className="text-sm text-ink-mute">{L('Файлов нет. Презентации, PDF, шаблоны промптов — загружайте сюда.', 'Файлдар жоқ. Презентацияларды, PDF, промпт үлгілерін осында жүктеңіз.')}</p> : (
          <ul className="divide-y divide-line">
            {((files ?? []) as LessonFile[]).map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                <IconFile className="h-4 w-4 text-ink-mute" /><span className="flex-1">{f.name}</span>
                <form action={deleteLessonFile.bind(null, f.id)}>
                  <ConfirmButton message={L(`Удалить файл ${f.name}?`, `${f.name} файлын жою керек пе?`)} className="p-1 text-red-600"><IconTrash className="h-4 w-4" /></ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-xl font-bold">{L('Тест', 'Тест')}</h2>
        {((qs ?? []) as QuizQuestion[]).map((q, i) => (
          <div key={q.id} className="flex gap-3 rounded-xl bg-canvas p-4">
            <div className="flex-1">
              <div className="text-sm font-bold">{i + 1}. {q.question_ru}</div>
              {q.question_kk && <div className="text-xs text-ink-soft">{q.question_kk}</div>}
              <ol className="mt-2 space-y-1 text-sm">
                {q.options_ru.map((o, oi) => (
                  <li key={oi} className={correct.get(q.id) === oi ? 'font-bold text-green-700' : 'text-ink-soft'}>
                    {correct.get(q.id) === oi ? '✓ ' : '○ '}{o}{q.options_kk[oi] ? <span className="text-ink-mute"> / {q.options_kk[oi]}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
            <form action={deleteQuestion.bind(null, q.id)}>
              <ConfirmButton message={L('Удалить вопрос?', 'Сұрақты жою керек пе?')} className="p-1 text-red-600"><IconTrash className="h-4 w-4" /></ConfirmButton>
            </form>
          </div>
        ))}
        <form action={addQuestion.bind(null, id)} className="grid gap-3 rounded-xl border-2 border-dashed border-line p-4 md:grid-cols-2">
          <div><label className="label">{L('Вопрос (рус.)', 'Сұрақ (орыс.)')}</label><input name="question_ru" required className="input" /></div>
          <div><label className="label">{L('Вопрос (каз.)', 'Сұрақ (қаз.)')}</label><input name="question_kk" className="input" /></div>
          <div><label className="label">{L('Варианты (рус.) — каждый с новой строки', 'Нұсқалар (орыс.) — әрқайсысы жаңа жолдан')}</label><textarea name="options_ru" required rows={4} className="input" /></div>
          <div><label className="label">{L('Варианты (каз.) — в том же порядке', 'Нұсқалар (қаз.) — сол ретпен')}</label><textarea name="options_kk" rows={4} className="input" /></div>
          <div className="flex items-end gap-3 md:col-span-2">
            <div><label className="label">{L('Номер правильного', 'Дұрыс жауап нөмірі')}</label><input name="correct" type="number" min={1} defaultValue={1} required className="input w-28" /></div>
            <button className="btn-dark">{L('+ Добавить вопрос', '+ Сұрақ қосу')}</button>
          </div>
        </form>
      </section>

      <form action={deleteLesson.bind(null, id)} className="border-t border-line pt-6">
        <ConfirmButton message={L('Удалить урок вместе с файлами, тестом и ответами студентов?', 'Сабақты файлдарымен, тестімен және студенттердің жауаптарымен бірге жою керек пе?')} className="text-sm font-semibold text-red-600">{L('Удалить урок', 'Сабақты жою')}</ConfirmButton>
      </form>
    </div>
  );
}
