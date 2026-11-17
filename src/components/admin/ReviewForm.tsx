'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { tr } from '@/lib/admin-lang';

export function ReviewForm({ id, feedback, aiFeedback, aiOn, action, kk }: {
  id: string; feedback: string; aiFeedback: string; aiOn: boolean; action: (f: FormData) => Promise<void>; kk?: boolean;
}) {
  const L = tr(kk);
  const router = useRouter();
  const [text, setText] = useState(feedback);
  const [ai, setAi] = useState(aiFeedback);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function runAi() {
    setBusy(true); setErr('');
    const res = await fetch('/api/ai/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ submissionId: id }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setAi(data.text); router.refresh(); } else setErr(data.error);
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      {aiOn && (
        <div className="rounded-xl border border-dashed border-ink/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[8px] font-extrabold text-brand">AI</span>
              {L('Черновик отзыва ИИ', 'ЖИ пікірінің жобасы')}
            </span>
            <span className="flex gap-3 text-xs font-semibold">
              {ai && <button type="button" onClick={() => setText(ai.replace(/\*\*/g, ''))} className="underline">{L('Вставить в комментарий', 'Пікірге қою')}</button>}
              <button type="button" onClick={runAi} disabled={busy} className="underline">{busy ? L('Проверяю…', 'Тексерудемін…') : ai ? L('Ещё раз', 'Тағы бір рет') : L('Проверить ИИ', 'ЖИ-мен тексеру')}</button>
            </span>
          </div>
          {ai && <div className="prose prose-sm mt-2 max-h-56 max-w-none overflow-y-auto text-xs prose-p:my-1"><ReactMarkdown>{ai}</ReactMarkdown></div>}
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        </div>
      )}
      <textarea name="feedback" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={L('Комментарий студенту…', 'Студентке пікір…')} className="input" />
      <div className="flex flex-wrap gap-2">
        <button name="status" value="accepted" className="btn-brand btn-sm">✓ {L('Принять', 'Қабылдау')}</button>
        <button name="status" value="needs_work" className="btn-dark btn-sm">{L('На доработку', 'Пысықтауға')}</button>
      </div>
    </form>
  );
}
