import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiEnabled, aiLimits, gemini, reviewPrompt } from '@/lib/gemini';
import { getLang, pick } from '@/lib/i18n';

export const maxDuration = 60;

/** Предварительная проверка задания ИИ. Студент — свою работу, админ — любую. */
export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: 'ИИ не настроен' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null) as { submissionId?: string; lessonId?: string } | null;
  if (!body?.submissionId && !body?.lessonId) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  // RLS: студент видит только свои ответы, админ — все
  let q = supabase.from('submissions').select('id,user_id,body,lesson_id,status');
  q = body.submissionId ? q.eq('id', body.submissionId) : q.eq('lesson_id', body.lessonId!).eq('user_id', user.id);
  const { data: sub } = await q.maybeSingle();
  if (!sub) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (sub.status === 'accepted' && sub.user_id === user.id) return NextResponse.json({ error: 'already accepted' }, { status: 400 });

  const { data: allowed } = await supabase.rpc('ai_take', { p_kind: 'review', p_limit: aiLimits.review });
  if (!allowed) return NextResponse.json({ error: 'Лимит проверок ИИ на сегодня исчерпан' }, { status: 429 });

  const admin = createAdminClient();
  const { data: lesson } = await admin.from('lessons').select('*, courses(title_ru,title_kk)').eq('id', sub.lesson_id).single();
  if (!lesson) return NextResponse.json({ error: 'lesson not found' }, { status: 404 });

  // Язык отзыва: язык интерфейса студента, если проверяет он сам; админ — по языку ответа
  const lang = sub.user_id === user.id ? await getLang() : (/[әғқңөұүһі]/i.test(sub.body) ? 'kk' : 'ru');

  try {
    const text = await gemini(
      reviewPrompt({
        lang,
        course: pick(lesson.courses ?? {}, 'title', lang),
        lesson: pick(lesson, 'title', lang),
        content: pick(lesson, 'content', lang),
        assignment: pick(lesson, 'assignment', lang),
      }),
      [{ role: 'user', text: `Ответ студента:\n\n${(sub.body || '(пусто)').slice(0, 8000)}` }],
    );
    await admin.from('submissions').update({ ai_feedback: text, ai_at: new Date().toISOString() }).eq('id', sub.id);
    revalidatePath('/', 'layout');
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: 'ИИ временно недоступен', detail: (e as Error).message }, { status: 502 });
  }
}
