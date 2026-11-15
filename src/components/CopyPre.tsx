'use client';
import { useRef, useState } from 'react';

/** Блок кода с кнопкой «Копировать» — для готовых промтов в уроках. */
export function CopyPre(props: React.HTMLAttributes<HTMLPreElement>) {
  const ref = useRef<HTMLPreElement>(null);
  const [done, setDone] = useState(false);
  async function copy() {
    const text = ref.current?.innerText ?? '';
    try { await navigator.clipboard.writeText(text); } catch {
      const r = document.createRange(); if (ref.current) { r.selectNodeContents(ref.current); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); document.execCommand('copy'); }
    }
    setDone(true); setTimeout(() => setDone(false), 1500);
  }
  return (
    <div className="group relative">
      <pre ref={ref} {...props} className={`${props.className ?? ''} whitespace-pre-wrap pr-12`} />
      <button type="button" onClick={copy} title="Копировать / Көшіру" aria-label="Копировать"
        className="absolute right-2 top-2 rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-ink shadow-sm transition hover:bg-brand-dark">
        {done ? '✓' : '⧉'}
      </button>
    </div>
  );
}
