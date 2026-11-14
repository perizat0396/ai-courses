'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export function ReviewForm({ id, feedback, aiFeedback, aiOn, action }: {
  id: string; feedback: string; aiFeedback: string; aiOn: boolean; action: (f: FormData) => Promise<void>;
}) {
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
              Черновик отзыва ИИ
            </span>
            <span className="flex gap-3 text-xs font-semibold">
              {ai && <button type="button" onClick={() => setText(ai.replace(/\*\*/g, ''))} className="underline">Вставить в комментарий</button>}
              <button type="button" onClick={runAi} disabled={busy} className="underline">{busy ? 'Проверяю…' : ai ? 'Ещё раз' : 'Проверить ИИ'}</button>
            </span>
          </div>
          {ai && <div className="prose prose-sm mt-2 max-h-56 max-w-none overflow-y-auto text-xs prose-p:my-1"><ReactMarkdown>{ai}</ReactMarkdown></div>}
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        </div>
      )}
      <textarea name="feedback" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Комментарий студенту…" className="input" />
      <div className="flex flex-wrap gap-2">
        <button name="status" value="accepted" className="btn-brand btn-sm">✓ Принять</button>
        <button name="status" value="needs_work" className="btn-dark btn-sm">На доработку</button>
      </div>
    </form>
  );
}
