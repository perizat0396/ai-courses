'use client';
import { useEffect, useRef, useState } from 'react';

/** Встроенная игра-микрокурс: iframe подстраивает высоту под содержимое (сообщение aiGameHeight). */
export function Game({ src }: { src: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(900);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || typeof e.data !== 'object' || !e.data) return;
      if (typeof e.data.aiGameHeight === 'number') setH(Math.max(400, Math.ceil(e.data.aiGameHeight)));
      if (e.data.aiGameTop) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  return (
    <div className="not-prose -mx-2 sm:mx-0">
      <iframe ref={ref} src={src} title="ChatGPT" style={{ height: h }} className="w-full scroll-mt-4 rounded-2xl border-0" allow="clipboard-write" />
    </div>
  );
}
