'use client';
import { useRef } from 'react';

/** Встроенная HTML-презентация урока (файл из /public/slides, доступ только после входа — см. middleware). */
export function Slides({ src }: { src: string }) {
  const kk = /-kk\.html$/.test(src);
  const L = kk
    ? { title: 'Сабақ презентациясы', full: 'Толық экран', tab: 'Жаңа қойындыда ашу', hint: 'Слайдтарды → ← пернелерімен немесе слайдты басып ауыстырыңыз' }
    : { title: 'Презентация урока', full: 'На весь экран', tab: 'Открыть в новой вкладке', hint: 'Листайте стрелками → ← или кликом по слайду' };
  const ref = useRef<HTMLIFrameElement>(null);
  const full = () => {
    const el = ref.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => window.open(src, '_blank'));
    else window.open(src, '_blank');
  };
  return (
    <div className="not-prose space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink shadow-lg">
        <iframe ref={ref} src={`${src}?v=${process.env.NEXT_PUBLIC_BUILD ?? ''}`} title={L.title} className="h-full w-full" allow="fullscreen; autoplay; clipboard-write" allowFullScreen />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={full} className="btn-brand">⛶ {L.full}</button>
        <a href={src} target="_blank" rel="noopener" className="btn-ghost">{L.tab}</a>
        <span className="text-ink-mute">{L.hint}</span>
      </div>
    </div>
  );
}
