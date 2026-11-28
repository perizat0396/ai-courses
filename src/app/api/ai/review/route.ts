import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiEnabled, aiStudentEnabled, aiLimits, gemini, reviewPrompt, type GeminiFile, type ReviewMode } from '@/lib/gemini';
import { getDict, getLang, pick } from '@/lib/i18n';

export const maxDuration = 60;

const MODES: ReviewMode[] = ['check', 'feedback', 'motivate'];
const MAX_FILE = 7 * 1024 * 1024;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' };

/**
 * ИИ-помощник проверки заданий.
 * Преподаватель (админ): mode = check (черновик проверки) | feedback (комментарий студенту) | motivate (мотивационный отзыв).
 * Студент (только при AI_STUDENT=on): самопроверка своей работы, mode = check.
 */
export async function POST(req: Request) {
  const { t } = await getDict();
  if (!aiEnabled()) return NextResponse.json({ error: t.aiOff }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = me?.role === 'admin';
  if (!isAdmin && !aiStudentEnabled()) return NextResponse.json({ error: t.aiOff }, { status: 503 });

  const body = await req.json().catch(() => null) as { submissionId?: string; lessonId?: string; mode?: ReviewMode; lang?: 'ru' | 'kk' } | null;
  if (!body?.submissionId && !body?.lessonId) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const mode: ReviewMode = isAdmin && body.mode && MODES.includes(body.mode) ? body.mode : 'check';

  // RLS: студент видит только свои ответы, админ — все
  let q = supabase.from('submissions').select('id,user_id,body,lesson_id,status,file_path,profiles(full_name)');
  q = body.submissionId ? q.eq('id', body.submissionId) : q.eq('lesson_id', body.lessonId!).eq('user_id', user.id);
  const { data: sub } = await q.maybeSingle();
  if (!sub) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (sub.status === 'accepted' && sub.user_id === user.id) return NextResponse.json({ error: 'already accepted' }, { status: 400 });

  if (!isAdmin) {
    const { data: allowed } = await supabase.rpc('ai_take', { p_kind: 'review', p_limit: aiLimits.review });
    if (!allowed) return NextResponse.json({ error: t.aiReviewLimit }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: lesson } = await admin.from('lessons').select('*, courses(title_ru,title_kk)').eq('id', sub.lesson_id).single();
  if (!lesson) return NextResponse.json({ error: 'lesson not found' }, { status: 404 });

  // Прикреплённый файл (картинка или PDF) — тоже отдаём модели
  const files: GeminiFile[] = [];
  if (sub.file_path) {
    const ext = String(sub.file_path).split('.').pop()?.toLowerCase() ?? '';
    const { data: blob } = await admin.storage.from('submissions').download(sub.file_path);
    const mime = blob?.type && (blob.type.startsWith('image/') || blob.type === 'application/pdf') ? blob.type : MIME[ext];
    if (blob && mime && blob.size <= MAX_FILE) files.push({ mime, data: Buffer.from(await blob.arrayBuffer()).toString('base64') });
  }

  // Язык: студент — язык интерфейса; админ — выбранный или по языку ответа
  const lang: 'ru' | 'kk' = !isAdmin ? await getLang()
    : body.lang === 'kk' || body.lang === 'ru' ? body.lang
    : /[әғқңөұүһі]/i.test(sub.body || '') ? 'kk' : 'ru';
  const prof = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;
  const name = (prof?.full_name || '').trim().split(/\s+/).slice(0, 2).join(' ');

  try {
    const text = await gemini(
      reviewPrompt({
        lang, mode, name: isAdmin ? name : undefined, hasFile: files.length > 0, forStudent: !isAdmin,
        course: pick(lesson.courses ?? {}, 'title', lang),
        lesson: pick(lesson, 'title', lang),
        content: pick(lesson, 'content', lang),
        assignment: pick(lesson, 'assignment', lang),
      }),
      [{ role: 'user', text: `Ответ студента:\n\n${(sub.body || '(текста нет)').slice(0, 8000)}` }],
      { kind: 'review', files },
    );
    if (mode === 'check') {
      await admin.from('submissions').update({ ai_feedback: text, ai_at: new Date().toISOString() }).eq('id', sub.id);
      revalidatePath('/', 'layout');
    }
    return NextResponse.json({ text, mode, sawFile: files.length > 0 });
  } catch (e) {
    return NextResponse.json({ error: t.aiDown, detail: (e as Error).message }, { status: 502 });
  }
}
