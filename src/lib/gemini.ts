import 'server-only';

export type GeminiMsg = { role: 'user' | 'model'; text: string };

export const aiEnabled = () => !!process.env.GEMINI_API_KEY;
export const aiLimits = {
  chat: Number(process.env.AI_CHAT_DAILY_LIMIT ?? 40),
  review: Number(process.env.AI_REVIEW_DAILY_LIMIT ?? 15),
};

/** Запрос к Gemini API (generateContent). Ключ хранится только на сервере. */
export async function gemini(system: string, messages: GeminiMsg[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY не задан');
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const res = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Gemini error', res.status, JSON.stringify(data).slice(0, 500));
    throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('')
    .trim();
  if (!text) throw new Error('Пустой ответ модели');
  return text;
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '\n…' : s);

export function tutorPrompt(o: { lang: 'ru' | 'kk'; course: string; lesson: string; content: string; assignment: string }) {
  const language = o.lang === 'kk' ? 'на казахском языке (если студент пишет по-русски — отвечай по-русски)' : 'на русском языке (если студент пишет по-казахски — отвечай по-казахски)';
  return `Ты — ИИ-помощник учебной платформы курсов по искусственному интеллекту. Курс: «${o.course}». Текущий урок: «${o.lesson}».

Твоя задача — помогать студенту понять материал и научиться работать с ИИ-инструментами (ChatGPT, Claude, Gemini и др.).
Правила:
- Отвечай ${language}, просто и дружелюбно, коротко (обычно до 150–200 слов), с примерами. Студенты — взрослые без технического опыта.
- Опирайся на материал урока ниже; если вопрос шире урока, но по теме ИИ — тоже помогай.
- Если вопрос про задание урока: не выполняй задание за студента целиком. Объясни подход, дай подсказки, разбери его черновик, предложи улучшения.
- Не проси и не сохраняй персональные данные. Напоминай не загружать в ИИ конфиденциальную информацию, если это уместно.
- На вопросы не по теме обучения вежливо возвращай к курсу.

=== Материал урока ===
${clip(o.content || '(текст урока пока не добавлен)', 12000)}

=== Задание урока ===
${clip(o.assignment || '(нет задания)', 3000)}`;
}

export function reviewPrompt(o: { lang: 'ru' | 'kk'; course: string; lesson: string; content: string; assignment: string }) {
  return `Ты — ассистент преподавателя курса «${o.course}», урок «${o.lesson}». Проверь ответ студента на задание.

Задание:
${clip(o.assignment, 3000)}

Материал урока (для контекста):
${clip(o.content || '—', 6000)}

Напиши отзыв ${o.lang === 'kk' ? 'на казахском языке' : 'на русском языке'}, обращаясь к студенту на «вы», в формате Markdown:
**Оценка:** одно из — «Выполнено», «Почти готово», «Нужно доработать» (на казахском: «Орындалды», «Дайын дерлік», «Пысықтау керек»).
**Что хорошо:** 1–3 пункта.
**Что улучшить:** 1–3 конкретных пункта с примером, как переписать промпт или текст.
Будь доброжелательным и конкретным, не длиннее 200 слов. Если ответ пустой или не по заданию — так и скажи. Прикреплённые файлы ты не видишь — оценивай только текст.`;
}
