'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Микрокурс: урок по шагам — один экран = одна мысль, кнопки «Назад / Далее».
 * В тексте урока шаги разделяются строкой «::step».
 */
export function Stepper({ steps, kk, storeKey }: { steps: ReactNode[]; kk: boolean; storeKey: string }) {
  const L = kk
    ? { step: 'Қадам', of: '/', back: 'Артқа', next: 'Әрі қарай', done: 'Сабақ аяқталды ✓', again: 'Басынан бастау', all: 'Барлығын бір бетте көрсету', one: 'Қадаммен көрсету' }
    : { step: 'Шаг', of: '/', back: 'Назад', next: 'Далее', done: 'Урок пройден ✓', again: 'Начать сначала', all: 'Показать всё на одной странице', one: 'Показать по шагам' };
  const n = steps.length;
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Помним, на каком шаге остановился студент (только в этом браузере).
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storeKey));
      if (v > 0 && v < n) setI(v);
    } catch {}
  }, [storeKey, n]);

  const go = (to: number) => {
    const v = Math.max(0, Math.min(n - 1, to));
    setI(v);
    try { localStorage.setItem(storeKey, String(v)); } catch {}
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [i]);

  useEffect(() => {
    if (all) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (all) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setAll(false)} className="btn-ghost btn-sm">{L.one}</button>
        {steps.map((s, k) => (
          <div key={k} className="card p-6 md:p-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-mute">{L.step} {k + 1}{L.of}{n}</div>
            {s}
          </div>
        ))}
      </div>
    );
  }

  const last = i === n - 1;
  return (
    <div ref={top} className="scroll-mt-6">
      <div className="mb-3 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-ink-mute">
        <span>{L.step} {i + 1}{L.of}{n}</span>
        <button type="button" onClick={() => setAll(true)} className="normal-case tracking-normal underline decoration-line underline-offset-4 hover:text-ink">{L.all}</button>
      </div>
      <div className="mb-5 flex gap-1" aria-hidden>
        {steps.map((_, k) => (
          <button key={k} type="button" tabIndex={-1} onClick={() => go(k)}
            className={`h-1.5 flex-1 rounded-full transition ${k <= i ? 'bg-brand' : 'bg-line hover:bg-ink-mute/40'}`} />
        ))}
      </div>

      <div key={i} className="card min-h-[320px] animate-[fadein_.25s_ease-out] p-6 md:p-10">
        {steps[i]}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn-ghost">← {L.back}</button>
        {last
          ? <span className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-sm font-semibold text-brand-dark">{L.done}</span>
              <button type="button" onClick={() => go(0)} className="btn-ghost btn-sm">{L.again}</button>
            </span>
          : <button type="button" onClick={() => go(i + 1)} className="btn-brand px-8 py-4 text-base">{L.next} →</button>}
      </div>
    </div>
  );
}
