'use client';
import { useState } from 'react';
import { Markdown } from '../Markdown';
import { tr } from '@/lib/tr';

/** Поле RU/KZ с вкладками и предпросмотром Markdown. Оба textarea остаются в форме. */
export function Bilingual({ name, label, ru, kk, rows = 12, hint, uiKk }: { name: string; label: string; ru: string; kk: string; rows?: number; hint?: string; uiKk?: boolean }) {
  const L = tr(uiKk);
  const [tab, setTab] = useState<'ru' | 'kk' | 'preview'>(uiKk ? 'kk' : 'ru');
  const [vals, setVals] = useState({ ru, kk });
  const [pvLang, setPvLang] = useState<'ru' | 'kk'>(uiKk ? 'kk' : 'ru');
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4">
        <span className="text-sm font-bold">{label}</span>
        {(['ru', 'kk'] as const).map((l) => (
          <button key={l} type="button" onClick={() => { setTab(l); setPvLang(l); }} className={tab === l ? 'tab-active' : 'tab'}>
            {l === 'ru' ? L('Русский', 'Орысша') : 'Қазақша'}{!vals[l].trim() && <span className="ml-1 text-red-500">•</span>}
          </button>
        ))}
        <button type="button" onClick={() => setTab('preview')} className={tab === 'preview' ? 'tab-active' : 'tab'}>{L('Предпросмотр', 'Алдын ала қарау')}</button>
        {hint && <span className="ml-auto text-xs text-ink-mute">{hint}</span>}
      </div>
      {(['ru', 'kk'] as const).map((l) => (
        <textarea key={l} name={`${name}_${l}`} rows={rows} value={vals[l]}
          onChange={(e) => setVals((v) => ({ ...v, [l]: e.target.value }))}
          className={`input font-mono text-[13px] leading-relaxed ${tab === l ? '' : 'hidden'}`} />
      ))}
      {tab === 'preview' && (
        <div className="rounded-xl border border-line p-6">
          {vals[pvLang].trim() ? <Markdown>{vals[pvLang]}</Markdown> : <p className="text-sm text-ink-mute">{L('Пусто', 'Бос')}</p>}
        </div>
      )}
    </div>
  );
}
