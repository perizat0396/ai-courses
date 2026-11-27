'use server';
import { setDraft } from '@/lib/draft';
import { getLang } from '@/lib/i18n';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const done = () => revalidatePath('/', 'layout');

// ---------------- Курсы ----------------
export async function createCourse(f: FormData) {
  const { supabase } = await requireAdmin();
  const { data: last } = await supabase.from('courses').select('position').order('position', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('courses').insert({
    title_ru: s(f, 'title_ru') || 'Новый курс', title_kk: s(f, 'title_kk'),
    theme: s(f, 'theme') || 'yellow', position: (last?.position ?? 0) + 1,
  }).select('id').single();
  if (error) throw new Error(error.message);
  done();
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(id: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('courses').update({
    title_ru: s(f, 'title_ru'), title_kk: s(f, 'title_kk'),
    description_ru: s(f, 'description_ru'), description_kk: s(f, 'description_kk'),
    theme: s(f, 'theme') || 'yellow', is_published: f.get('is_published') === 'on',
  }).eq('id', id);
  if (error) throw new Error(error.message);
  done();
}

export async function deleteCourse(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from('courses').delete().eq('id', id);
  done();
  redirect('/admin/courses');
}

// ---------------- Модули ----------------
export async function addModule(courseId: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const { data: last } = await supabase.from('modules').select('position').eq('course_id', courseId).order('position', { ascending: false }).limit(1).maybeSingle();
  await supabase.from('modules').insert({
    course_id: courseId, title_ru: s(f, 'title_ru') || 'Новый модуль', title_kk: s(f, 'title_kk'), position: (last?.position ?? 0) + 1,
  });
  done();
}

export async function updateModule(id: string, f: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from('modules').update({ title_ru: s(f, 'title_ru'), title_kk: s(f, 'title_kk') }).eq('id', id);
  done();
}

export async function deleteModule(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from('modules').delete().eq('id', id);
  done();
}

async function move(table: 'modules' | 'lessons', parentCol: 'course_id' | 'module_id', id: string, dir: -1 | 1) {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from(table).select(`id, ${parentCol}`).eq('id', id).single();
  if (!row) return;
  const parent = (row as Record<string, string>)[parentCol];
  const { data: sibs } = await supabase.from(table).select('id').eq(parentCol, parent).order('position').order('id');
  const ids = (sibs ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((rid, k) => supabase.from(table).update({ position: k + 1 }).eq('id', rid)));
  done();
}
export async function moveModule(id: string, dir: -1 | 1) { await move('modules', 'course_id', id, dir); }
export async function moveLesson(id: string, dir: -1 | 1) { await move('lessons', 'module_id', id, dir); }

// ---------------- Уроки ----------------
export async function addLesson(moduleId: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const { data: mod } = await supabase.from('modules').select('course_id').eq('id', moduleId).single();
  const { data: last } = await supabase.from('lessons').select('position').eq('module_id', moduleId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('lessons').insert({
    module_id: moduleId, course_id: mod?.course_id, title_ru: s(f, 'title_ru') || 'Новый урок', position: (last?.position ?? 0) + 1,
  }).select('id').single();
  if (error) throw new Error(error.message);
  done();
  redirect(`/admin/lessons/${data.id}`);
}

export async function updateLesson(id: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const dur = parseInt(s(f, 'duration_min'), 10);
  const { error } = await supabase.from('lessons').update({
    title_ru: s(f, 'title_ru'), title_kk: s(f, 'title_kk'),
    module_id: s(f, 'module_id'),
    video_url: s(f, 'video_url') || null,
    duration_min: Number.isFinite(dur) ? dur : null,
    content_ru: setDraft(String(f.get('content_ru') ?? ''), f.get('hidden') === 'on'), content_kk: String(f.get('content_kk') ?? ''),
    assignment_ru: s(f, 'assignment_ru'), assignment_kk: s(f, 'assignment_kk'),
  }).eq('id', id);
  if (error) throw new Error(error.message);
  done();
}

export async function deleteLesson(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('lessons').select('course_id').eq('id', id).single();
  const { data: files } = await supabase.from('lesson_files').select('path').eq('lesson_id', id);
  const { data: l } = await supabase.from('lessons').select('video_path').eq('id', id).single();
  const paths = [...(files ?? []).map((x) => x.path as string), ...(l?.video_path ? [l.video_path] : [])];
  if (paths.length) await supabase.storage.from('lesson-files').remove(paths);
  await supabase.from('lessons').delete().eq('id', id);
  done();
  redirect(data ? `/admin/courses/${data.course_id}` : '/admin/courses');
}

// Файл уже загружен браузером в хранилище — здесь только запись в базе
export async function addLessonFile(lessonId: string, name: string, path: string, size: number) {
  const { supabase } = await requireAdmin();
  await supabase.from('lesson_files').insert({ lesson_id: lessonId, name, path, size });
  done();
}

export async function deleteLessonFile(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('lesson_files').select('path').eq('id', id).single();
  if (data) await supabase.storage.from('lesson-files').remove([data.path]);
  await supabase.from('lesson_files').delete().eq('id', id);
  done();
}

export async function setLessonVideoPath(lessonId: string, path: string | null) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('lessons').select('video_path').eq('id', lessonId).single();
  if (data?.video_path && data.video_path !== path) await supabase.storage.from('lesson-files').remove([data.video_path]);
  await supabase.from('lessons').update({ video_path: path }).eq('id', lessonId);
  done();
}

// ---------------- Тест ----------------
const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

export async function addQuestion(lessonId: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const opts = lines(s(f, 'options_ru'));
  const optsKk = lines(s(f, 'options_kk'));
  const correct = parseInt(s(f, 'correct'), 10) - 1;
  if (!s(f, 'question_ru') || opts.length < 2) throw new Error((await getLang()) === 'kk' ? 'Сұрақ және кемінде 2 жауап нұсқасы қажет' : 'Нужен вопрос и минимум 2 варианта ответа');
  if (!(correct >= 0 && correct < opts.length)) throw new Error((await getLang()) === 'kk' ? 'Дұрыс жауап нөмірі ауқымнан тыс' : 'Номер правильного ответа вне диапазона');
  if (optsKk.length && optsKk.length !== opts.length) throw new Error((await getLang()) === 'kk' ? 'Қазақша нұсқалар саны орысшамен бірдей болуы керек' : 'Количество вариантов на казахском должно совпадать с русским');
  const { data: last } = await supabase.from('quiz_questions').select('position').eq('lesson_id', lessonId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('quiz_questions').insert({
    lesson_id: lessonId, question_ru: s(f, 'question_ru'), question_kk: s(f, 'question_kk'),
    options_ru: opts, options_kk: optsKk, position: (last?.position ?? 0) + 1,
  }).select('id').single();
  if (error) throw new Error(error.message);
  await supabase.from('quiz_answers').insert({ question_id: data.id, correct_index: correct });
  done();
}

export async function deleteQuestion(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from('quiz_questions').delete().eq('id', id);
  done();
}

// ---------------- Студенты и доступ ----------------
export async function setAccess(userId: string, courseId: string, on: boolean) {
  const { supabase } = await requireAdmin();
  if (on) await supabase.from('enrollments').upsert({ user_id: userId, course_id: courseId });
  else await supabase.from('enrollments').delete().eq('user_id', userId).eq('course_id', courseId);
  done();
}

export type CreateStudentState = { ok?: string; error?: string };

export async function createStudent(_: CreateStudentState, f: FormData): Promise<CreateStudentState> {
  const { supabase } = await requireAdmin();
  const email = s(f, 'email').toLowerCase();
  const password = s(f, 'password');
  if (!email || password.length < 6) return { error: (await getLang()) === 'kk' ? 'Email мен құпиясөзді көрсетіңіз (кемінде 6 таңба)' : 'Укажите email и пароль (минимум 6 символов)' };
  let admin;
  try { admin = createAdminClient(); } catch (e) { return { error: (e as Error).message }; }
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: s(f, 'full_name') },
  });
  if (error) return { error: error.message.includes('already') ? ((await getLang()) === 'kk' ? 'Мұндай email-мен пайдаланушы бар — оны тізімнен тауып, қолжетімділік ашыңыз' : 'Пользователь с таким email уже есть — найдите его в списке и откройте доступ') : error.message };
  const courseIds = f.getAll('courses').map(String).filter(Boolean);
  if (courseIds.length) {
    await supabase.from('enrollments').upsert(courseIds.map((course_id) => ({ user_id: data.user.id, course_id })));
  }
  done();
  return { ok: (await getLang()) === 'kk' ? `${email} студенті құрылды. Кіру үшін оған email мен құпиясөзді беріңіз.` : `Студент ${email} создан. Передайте ему email и пароль для входа.` };
}

// ---------------- Проверка заданий ----------------
export async function reviewSubmission(id: string, f: FormData) {
  const { supabase } = await requireAdmin();
  const status = s(f, 'status');
  if (!['accepted', 'needs_work', 'submitted'].includes(status)) return;
  await supabase.from('submissions').update({ status, feedback: s(f, 'feedback'), reviewed_at: new Date().toISOString() }).eq('id', id);
  done();
}

// ---------------- Удаление студента ----------------
export async function deleteStudent(userId: string) {
  const { supabase, user } = await requireAdmin();
  if (userId === user.id) return;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!p || p.role === 'admin') return;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  done();
}
