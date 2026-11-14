import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiEnabled, aiLimits, gemini, tutorPrompt, type GeminiMsg } from '@/lib/gemini';
import { getLang, pick } from '@/lib/i18n';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: 'ИИ-помощник не настроен' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null) as { lessonId?: string; messages?: GeminiMsg[] } | null;
  const msgs = (body?.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
  if (!body?.lessonId || !msgs.length || msgs[msgs.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // RLS: урок вернётся, только если у студента есть доступ к курсу
  const { data: lesson } = await supabase.from('lessons').select('*, courses(title_ru,title_kk)').eq('id', body.lessonId).maybeSingle();
  if (!lesson) return NextResponse.json({ error: 'no access' }, { status: 403 });

  const lang = await getLang();
  const { data: allowed } = await supabase.rpc('ai_take', { p_kind: 'chat', p_limit: aiLimits.chat });
  if (!allowed) {
    return NextResponse.json({ error: lang === 'kk' ? 'Бүгінгі сұрақтар лимиті таусылды. Ертең қайта келіңіз.' : 'Лимит вопросов на сегодня исчерпан. Возвращайтесь завтра.' }, { status: 429 });
  }

  try {
    const text = await gemini(
      tutorPrompt({
        lang,
        course: pick(lesson.courses ?? {}, 'title', lang),
        lesson: pick(lesson, 'title', lang),
        content: pick(lesson, 'content', lang),
        assignment: pick(lesson, 'assignment', lang),
      }),
      msgs,
    );
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: lang === 'kk' ? 'ЖИ уақытша қолжетімсіз' : 'ИИ временно недоступен', detail: (e as Error).message }, { status: 502 });
  }
}
