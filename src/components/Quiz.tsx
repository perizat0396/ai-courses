'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Q = { id: string; question: string; options: string[] };
type Labels = { quiz: string; check: string; again: string; result: string };

export function Quiz({ lessonId, questions, last, labels }: {
  lessonId: string; questions: Q[]; last: { score: number; total: number } | null; labels: Labels;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [res, setRes] = useState<{ score: number; total: number; correct: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function check() {
    setBusy(true); setErr('');
    const { data, error } = await createClient().rpc('submit_quiz', { p_lesson: lessonId, p_answers: answers.map((a) => a ?? -1) });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setRes(data as { score: number; total: number; correct: number[] });
  }

  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{labels.quiz}</h3>
        {(res || last) && (
          <span className="chip bg-brand">{labels.result}: {(res ?? last)!.score}/{(res ?? last)!.total}</span>
        )}
      </div>
      <div className="mt-6 space-y-6">
        {questions.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="mb-3 text-sm font-bold">{qi + 1}. {q.question}</legend>
            <div className="space-y-2">
              {q.options.map((o, oi) => {
                const chosen = answers[qi] === oi;
                const isCorrect = res && res.correct[qi] === oi;
                const isWrong = res && chosen && res.correct[qi] !== oi;
                return (
                  <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    isCorrect ? 'border-green-500 bg-green-50' : isWrong ? 'border-red-400 bg-red-50' : chosen ? 'border-ink bg-canvas' : 'border-line hover:bg-canvas'
                  }`}>
                    <input type="radio" name={q.id} className="accent-black" disabled={!!res}
                      checked={chosen} onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))} />
                    {o}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      <div className="mt-6">
        {res ? (
          <button className="btn-ghost" onClick={() => { setRes(null); setAnswers(questions.map(() => null)); }}>{labels.again}</button>
        ) : (
          <button className="btn-dark" disabled={busy || answers.some((a) => a === null)} onClick={check}>{labels.check}</button>
        )}
      </div>
    </div>
  );
}
