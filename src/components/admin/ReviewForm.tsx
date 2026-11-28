'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { tr } from '@/lib/tr';

type Mode = 'check' | 'feedback' | 'motivate';

export function ReviewForm({ id, feedback, aiFeedback, aiOn, action, kk }: {
  id: string; feedback: string; aiFeedback: string; aiOn: boolean; action: (f: FormData) => Promise<void>; kk?: boolean;
}) {
  const L = tr(kk);
  const router = useRouter();
  const [text, setText] = useState(feedback);
  const [ai, setAi] = useState(aiFeedback);
  const [mode, setMode] = useState<Mode>('check');
  const [lang, setLang] = useState<'auto' | 'ru' | 'kk'>('auto');
  const [busy, setBusy] = useState<Mode | null>(null);
  const [err, setErr] = useState('');
  const [sawFile, setSawFile] = useState<boolean | null>(null);

  const MODES: { m: Mode; label: string; hint: string }[] = [
    { m: 'check', label: L('Проверить', 'Тексеру'), hint: L('Оценка, что хорошо и что улучшить — для вас', 'Баға, не жақсы, нені жақсарту керек — сізге') },
    { m: 'feedback', label: L('Обратная связь', 'Кері байланыс'), hint: L('Готовый комментарий студенту', 'Студентке дайын пікір') },
    { m: 'motivate', label: L('Мотивация', 'Мотивация'), hint: L('Короткий тёплый отзыв, который вдохновит продолжать', 'Әрі қарай жалғастыруға шабыттандыратын қысқа жылы пікір') },
  ];

  async function run(m: Mode) {
    setBusy(m); setErr(''); setMode(m);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId: id, mode: m, lang: lang === 'auto' ? undefined : lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setAi(data.text); setSawFile(!!data.sawFile); if (m === 'check') router.refresh(); }
      else setErr([data.error, data.detail].filter(Boolean).join(': ') || L('Ошибка ИИ', 'ЖИ қатесі'));
    } catch { setErr(L('Нет связи с сервером', 'Сервермен байланыс жоқ')); }
    setBusy(null);
  }

  const plain = (s: string) => s.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();

  return (
    <form action={action} className="mt-4 space-y-3">
      {aiOn ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[8px] font-extrabold text-brand">AI</span>
              {L('ИИ-помощник Gemini', 'Gemini ЖИ-көмекшісі')}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              {L('Язык:', 'Тіл:')}
              {(['auto', 'ru', 'kk'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setLang(v)}
                  className={`rounded-full px-2 py-0.5 ${lang === v ? 'bg-ink text-white' : 'bg-ink/5'}`}>
                  {v === 'auto' ? L('авто', 'авто') : v === 'ru' ? 'RU' : 'KZ'}
                </button>
              ))}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODES.map(({ m, label, hint }) => (
              <button key={m} type="button" title={hint} onClick={() => run(m)} disabled={!!busy}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${mode === m && ai ? 'border-ink bg-ink text-white' : 'border-ink/20 hover:border-ink'}`}>
                {busy === m ? L('Пишу…', 'Жазып жатырмын…') : label}
              </button>
            ))}
          </div>
          {ai && (
            <>
              <div className="prose prose-sm mt-3 max-h-64 max-w-none overflow-y-auto rounded-lg bg-ink/[0.03] p-3 text-[13px] prose-p:my-1">
                <ReactMarkdown>{ai}</ReactMarkdown>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
                <button type="button" onClick={() => setText(plain(ai))} className="underline">{L('Вставить в комментарий', 'Пікірге қою')}</button>
                <button type="button" onClick={() => setText((t) => (t.trim() ? t.trim() + '\n\n' : '') + plain(ai))} className="underline">{L('Добавить к комментарию', 'Пікірге қосу')}</button>
                {sawFile !== null && (
                  <span className="text-ink/50">{sawFile ? L('ИИ посмотрел прикреплённый файл', 'ЖИ тіркелген файлды көрді') : L('Файл ИИ не видел — только текст', 'ЖИ файлды көрмеді — тек мәтін')}</span>
                )}
              </div>
            </>
          )}
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <p className="mt-2 text-[11px] text-ink/50">{L('Перед отправкой прочитайте и при необходимости поправьте текст ИИ.', 'Жіберер алдында ЖИ мәтінін оқып, қажет болса түзетіңіз.')}</p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink/20 p-3 text-xs text-ink/60">
          {L('ИИ-помощник выключен: на Vercel не добавлен ключ GEMINI_API_KEY.', 'ЖИ-көмекші өшірулі: Vercel-де GEMINI_API_KEY кілті қосылмаған.')}
        </p>
      )}
      <textarea name="feedback" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={L('Комментарий студенту…', 'Студентке пікір…')} className="input" />
      <div className="flex flex-wrap gap-2">
        <button name="status" value="accepted" className="btn-brand btn-sm">✓ {L('Принять', 'Қабылдау')}</button>
        <button name="status" value="needs_work" className="btn-dark btn-sm">{L('На доработку', 'Пысықтауға')}</button>
      </div>
    </form>
  );
}
