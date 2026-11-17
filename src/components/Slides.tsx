'use client';
import { useRef } from 'react';

/** Встроенная HTML-презентация урока (файл из /public/slides, доступ только после входа — см. middleware). */
export function Slides({ src }: { src: string }) {
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
        <iframe ref={ref} src={src} title="Презентация урока" className="h-full w-full" allow="fullscreen; autoplay; clipboard-write" allowFullScreen />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={full} className="btn-brand">⛶ На весь экран</button>
        <a href={src} target="_blank" rel="noopener" className="btn-ghost">Открыть в новой вкладке</a>
        <span className="text-ink-mute">Листайте стрелками → ← или кликом по слайду</span>
      </div>
    </div>
  );
}
