import 'server-only';

export type GeminiMsg = { role: 'user' | 'model'; text: string };
export type GeminiFile = { mime: string; data: string /* base64 */ };

/** Ключ задан → ИИ доступен преподавателю (проверка заданий в админке). */
export const aiEnabled = () => !!process.env.GEMINI_API_KEY;
/** ИИ для студентов (чат-помощник и самопроверка) — только если явно включён AI_STUDENT=on. */
export const aiStudentEnabled = () => aiEnabled() && process.env.AI_STUDENT === 'on';
export const aiLimits = {
  chat: Number(process.env.AI_CHAT_DAILY_LIMIT ?? 40),
  review: Number(process.env.AI_REVIEW_DAILY_LIMIT ?? 15),
};

const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const FALLBACK = list(process.env.GEMINI_FALLBACK_MODELS).length
  ? list(process.env.GEMINI_FALLBACK_MODELS)
  : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
/** Модели по порядку: основная, затем запасные (если основная недоступна или исчерпан лимит). */
export const models = (kind: 'chat' | 'review') => {
  const main = kind === 'review'
    ? process.env.GEMINI_REVIEW_MODEL || 'gemini-3.8-flash'
    : process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  return [main, ...FALLBACK.filter((m) => m !== main)];
};

async function callModel(model: string, system: string, messages: GeminiMsg[], files: GeminiFile[]) {
  const key = process.env.GEMINI_API_KEY!;
  const contents = messages.map((m, i) => ({
    role: m.role,
    parts: [
      ...(i === messages.length - 1 ? files.map((f) => ({ inlineData: { mimeType: f.mime, data: f.data } })) : []),
      { text: m.text },
    ],
  }));
  const res = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents }),
    signal: AbortSignal.timeout(50_000),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/** Запрос к Gemini API (generateContent). Ключ хранится только на сервере. */
export async function gemini(system: string, messages: GeminiMsg[], opts: { kind?: 'chat' | 'review'; files?: GeminiFile[] } = {}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY не задан');
  let lastErr = 'Gemini недоступен';
  for (const model of models(opts.kind ?? 'chat')) {
    const { res, data } = await callModel(model, system, messages, opts.files ?? []);
    if (res.ok) {
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
        .map((p: { text: string }) => p.text)
        .join('')
        .trim();
      if (text) return text;
      lastErr = 'Пустой ответ модели';
      continue;
    }
    console.error('Gemini error', model, res.status, JSON.stringify(data).slice(0, 500));
    lastErr = data?.error?.message || `Gemini HTTP ${res.status}`;
    // неверный ключ или запрос — другие модели не помогут
    if (res.status === 400 || res.status === 401 || res.status === 403) break;
  }
  throw new Error(lastErr);
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

export type ReviewMode = 'check' | 'feedback' | 'motivate';

export function reviewPrompt(o: { lang: 'ru' | 'kk'; course: string; lesson: string; content: string; assignment: string; mode?: ReviewMode; name?: string; hasFile?: boolean; forStudent?: boolean }) {
  const kk = o.lang === 'kk';
  const langLine = kk
    ? 'Пиши на казахском языке, грамотно, литературным языком. Обращайся на «сіз».'
    : 'Пиши на русском языке, грамотно. Обращайся на «вы».';
  const who = o.name ? `Имя студента: ${o.name}. Обратись по имени в начале.` : 'Имя студента неизвестно — обойдись без имени.';
  const files = o.hasFile
    ? 'К ответу приложен файл студента (он передан тебе) — внимательно посмотри его: соответствует ли заданию, читаются ли надписи, нет ли ошибок в тексте на картинке.'
    : 'Файлов нет или ты их не видишь — оценивай только текст ответа.';
  const ctx = `Курс: «${o.course}». Урок: «${o.lesson}». Студенты — взрослые люди без технического опыта, многие впервые работают с ИИ.

Задание:
${clip(o.assignment || '—', 3000)}

Материал урока (для контекста):
${clip(o.content || '—', 6000)}

${files}
${langLine}`;

  const mode = o.mode ?? 'check';
  if (mode === 'feedback') return `Ты — доброжелательный преподаватель курса. Напиши готовый комментарий студенту к его работе — его сразу увидит студент.
${ctx}
${who}
Структура (без заголовков, обычным текстом, 70–130 слов):
1) за что конкретно похвалить (назови, что именно получилось);
2) 1–2 конкретных совета, как сделать лучше, с примером формулировки промпта, если уместно;
3) тёплое завершение.
Если работа не по заданию или пустая — мягко объясни, что нужно сделать. Без оценок в баллах, без markdown-заголовков, без смайликов в начале.`;
  if (mode === 'motivate') return `Ты — тёплый, поддерживающий преподаватель курса. Напиши короткую мотивационную обратную связь студенту — её сразу увидит студент.
${ctx}
${who}
2–4 предложения, 35–70 слов: отметь конкретное достижение в этой работе, подчеркни прогресс (человек осваивает ИИ с нуля — это ценно) и вдохнови продолжать следующие занятия. Искренне, без пафоса и штампов, без markdown. Можно один уместный смайлик в конце.`;
  return `Ты — ассистент преподавателя. Проверь ответ студента на задание${o.forStudent ? '' : ' и подготовь черновик для преподавателя'}.
${ctx}
Формат (Markdown):
**Оценка:** одно из — «Выполнено», «Почти готово», «Нужно доработать» (на казахском: «Орындалды», «Дайын дерлік», «Пысықтау керек»).
**Что хорошо:** 1–3 пункта.
**Что улучшить:** 1–3 конкретных пункта с примером, как переписать промпт или текст.
Будь доброжелательным и конкретным, не длиннее 200 слов. Если ответ пустой или не по заданию — так и скажи.`;
}
