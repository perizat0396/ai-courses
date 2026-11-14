'use client';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Msg = { role: 'user' | 'model'; text: string };
type Labels = {
  title: string; hello: string; placeholder: string; thinking: string; note: string; quick: string[]; send: string;
};

export function AiChat({ lessonId, labels }: { lessonId: string; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy, open]);
  useEffect(() => { setMsgs([]); setErr(''); }, [lessonId]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user' as const, text: q }];
    setMsgs(next); setInput(''); setBusy(true); setErr('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMsgs([...next, { role: 'model', text: data.text }]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink py-3 pl-3 pr-5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5"
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-extrabold text-ink">AI</span>
        {labels.title}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-20 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:right-5 sm:w-[400px]">
          <div className="flex items-center justify-between bg-brand px-5 py-4">
            <div className="text-sm font-bold">{labels.title}</div>
            <button onClick={() => setOpen(false)} className="text-lg leading-none" aria-label="close">×</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <div className="rounded-2xl rounded-tl-sm bg-canvas p-3">{labels.hello}</div>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {labels.quick.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="chip border border-line bg-white hover:border-ink">{q}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                <div className={m.role === 'user'
                  ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-ink px-3 py-2 text-white'
                  : 'prose prose-sm max-w-none rounded-2xl rounded-tl-sm bg-canvas p-3 prose-p:my-1.5 prose-ul:my-1.5 prose-pre:whitespace-pre-wrap'}>
                  {m.role === 'user' ? m.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {busy && <div className="w-fit animate-pulse rounded-2xl bg-canvas px-3 py-2 text-ink-soft">{labels.thinking}</div>}
            {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-red-700">{err}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="border-t border-line p-3">
            <div className="flex gap-2">
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={labels.placeholder}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                className="input max-h-32 min-h-[44px] resize-none py-2.5"
              />
              <button disabled={busy || !input.trim()} className="btn-brand px-4" aria-label={labels.send}>➤</button>
            </div>
            <p className="mt-2 text-[11px] text-ink-mute">{labels.note}</p>
          </form>
        </div>
      )}
    </>
  );
}
