import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getCourseTree } from '@/lib/courses';
import {
  addLesson, addModule, deleteCourse, deleteModule, moveLesson, moveModule, updateCourse, updateModule,
} from '../../actions';
import { ConfirmButton } from '@/components/admin/Confirm';
import { IconArrowL, IconDown, IconEdit, IconTrash, IconUp } from '@/components/Icons';

export default async function AdminCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { course, tree } = await getCourseTree(supabase, id);
  if (!course) notFound();
  const { count } = await supabase.from('enrollments').select('user_id', { count: 'exact', head: true }).eq('course_id', id);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"><IconArrowL className="h-4 w-4" />Все курсы</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="h1 flex-1">{course.title_ru}</h1>
          <Link href={`/admin/students?course=${id}`} className="btn-ghost btn-sm">Студенты с доступом: {count ?? 0}</Link>
          <Link href={`/courses/${id}`} className="btn-ghost btn-sm">Как видит студент</Link>
        </div>
      </div>

      <form action={updateCourse.bind(null, id)} className="card grid gap-4 p-6 md:grid-cols-2">
        <div><label className="label">Название (рус.)</label><input name="title_ru" defaultValue={course.title_ru} required className="input" /></div>
        <div><label className="label">Атауы (қаз.)</label><input name="title_kk" defaultValue={course.title_kk} className="input" /></div>
        <div><label className="label">Описание (рус.)</label><textarea name="description_ru" defaultValue={course.description_ru} rows={4} className="input" /></div>
        <div><label className="label">Сипаттамасы (қаз.)</label><textarea name="description_kk" defaultValue={course.description_kk} rows={4} className="input" /></div>
        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <div>
            <span className="label">Цвет карточки</span>
            <div className="flex gap-2">
              {(['yellow', 'black', 'white'] as const).map((th) => (
                <label key={th} className="cursor-pointer">
                  <input type="radio" name="theme" value={th} defaultChecked={course.theme === th} className="peer sr-only" />
                  <span className={`block h-9 w-9 rounded-lg border-2 border-line peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-offset-2 ${th === 'yellow' ? 'bg-brand' : th === 'black' ? 'bg-ink' : 'bg-white'}`} />
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" name="is_published" defaultChecked={course.is_published} className="h-5 w-5 accent-black" />
            Опубликован (видят студенты с доступом)
          </label>
          <button className="btn-dark ml-auto">Сохранить</button>
        </div>
      </form>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Программа</h2>
        {tree.map((m, mi) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 bg-canvas p-4">
              <span className="text-xs font-bold uppercase text-ink-mute">Модуль {mi + 1}</span>
              <form action={updateModule.bind(null, m.id)} className="flex flex-1 flex-wrap gap-2">
                <input name="title_ru" defaultValue={m.title_ru} className="input min-w-48 flex-1 bg-white py-2" />
                <input name="title_kk" defaultValue={m.title_kk} placeholder="қаз." className="input min-w-48 flex-1 bg-white py-2" />
                <button className="btn-ghost btn-sm bg-white">OK</button>
              </form>
              <div className="flex gap-1">
                <form action={moveModule.bind(null, m.id, -1)}><button className="btn-ghost btn-sm bg-white" title="Выше"><IconUp className="h-4 w-4" /></button></form>
                <form action={moveModule.bind(null, m.id, 1)}><button className="btn-ghost btn-sm bg-white" title="Ниже"><IconDown className="h-4 w-4" /></button></form>
                <form action={deleteModule.bind(null, m.id)}>
                  <ConfirmButton message={`Удалить модуль «${m.title_ru}» со всеми уроками?`} className="btn-ghost btn-sm bg-white text-red-600" title="Удалить"><IconTrash className="h-4 w-4" /></ConfirmButton>
                </form>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {m.lessons.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/admin/lessons/${l.id}`} className="flex flex-1 items-center gap-3 text-sm font-semibold hover:underline">
                    <IconEdit className="h-4 w-4 text-ink-mute" />{l.title_ru}
                    {!l.title_kk && <span className="chip bg-red-50 text-red-600">нет KZ</span>}
                    {!l.content_ru && !l.video_url && !l.video_path && <span className="chip bg-canvas text-ink-mute">пустой</span>}
                  </Link>
                  <form action={moveLesson.bind(null, l.id, -1)}><button className="p-1 text-ink-mute hover:text-ink"><IconUp className="h-4 w-4" /></button></form>
                  <form action={moveLesson.bind(null, l.id, 1)}><button className="p-1 text-ink-mute hover:text-ink"><IconDown className="h-4 w-4" /></button></form>
                </li>
              ))}
              <li className="px-4 py-3">
                <form action={addLesson.bind(null, m.id)} className="flex gap-2">
                  <input name="title_ru" placeholder="Название нового урока" className="input flex-1 py-2" />
                  <button className="btn-brand btn-sm">+ Урок</button>
                </form>
              </li>
            </ul>
          </div>
        ))}
        <form action={addModule.bind(null, id)} className="card flex flex-wrap gap-2 border-2 border-dashed p-4 shadow-none">
          <input name="title_ru" placeholder="Название модуля (рус.)" required className="input min-w-48 flex-1" />
          <input name="title_kk" placeholder="Модуль атауы (қаз.)" className="input min-w-48 flex-1" />
          <button className="btn-dark">+ Модуль</button>
        </form>
      </section>

      <form action={deleteCourse.bind(null, id)} className="border-t border-line pt-6">
        <ConfirmButton message="Удалить курс целиком, со всеми уроками, доступами и ответами студентов? Это нельзя отменить." className="text-sm font-semibold text-red-600">
          Удалить курс
        </ConfirmButton>
      </form>
    </div>
  );
}
