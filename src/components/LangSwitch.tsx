'use client';
import { useTransition } from 'react';
import { setLang } from '@/app/actions';

export function LangSwitch({ lang }: { lang: 'ru' | 'kk' }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex rounded-lg bg-canvas p-1 text-xs font-bold ${pending ? 'opacity-60' : ''}`}>
      {(['ru', 'kk'] as const).map((l) => (
        <button
          key={l}
          onClick={() => start(() => setLang(l))}
          className={`rounded-md px-2.5 py-1 ${lang === l ? 'bg-ink text-white' : 'text-ink-soft'}`}
        >
          {l === 'ru' ? 'RU' : 'KZ'}
        </button>
      ))}
    </div>
  );
}
