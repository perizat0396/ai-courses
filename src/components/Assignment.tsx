'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Markdown } from './Markdown';

type Labels = {
  assignment: string; yourAnswer: string; attach: string; send: string; sent: string; feedback: string; status: string;
  aiReview: string; aiReviewNote: string; aiChecking: string; aiRecheck: string;
};
type Sub = { body: string; status: string; feedback: string; ai_feedback: string; file_url: string | null; file_name: string | null } | null;

export function Assignment({ lessonId, userId, task, sub, labels, ai }: {
  lessonId: string; userId: string; task: string; sub: Sub; labels: Labels; ai: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(sub?.body ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const locked = sub?.status === 'accepted';
  const [aiText, setAiText] = useState(sub?.ai_feedback ?? '');
  const [aiBusy, setAiBusy] = useState(false);

  async function runAi() {
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonId }) });
      const data = await res.json();
      if (res.ok) setAiText(data.text); else setMsg(data.error || 'AI error');
    } finally { setAiBusy(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const supabase = createClient();
    let path: string | null = null;
    if (file) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      path = `${userId}/${lessonId}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from('submissions').upload(path, file);
      if (error) { setMsg(error.message); setBusy(false); return; }
    }
    const { error } = await supabase.rpc('submit_assignment', { p_lesson: lessonId, p_body: body, p_file: path });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg(labels.sent); setFile(null);
    router.refresh();
    if (ai) runAi();
  }

  return (
    <div className="rounded-2xl bg-brand-soft p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{labels.assignment}</h3>
        {sub && <span className={`chip ${sub.status === 'accepted' ? 'bg-green-100 text-green-800' : sub.status === 'needs_work' ? 'bg-ink text-white' : 'bg-white'}`}>{labels.status}</span>}
      </div>
      <div className="mt-4"><Markdown>{task}</Markdown></div>
      {sub?.feedback && (
        <div className="mt-5 rounded-xl bg-white p-4">
          <div className="text-xs font-bold text-ink-soft">{labels.feedback}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{sub.feedback}</p>
        </div>
      )}
      {ai && (aiBusy || aiText) && (
        <div className="mt-5 rounded-xl border border-ink/10 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[9px] font-extrabold text-brand">AI</span>
            {labels.aiReview}
          </div>
          {aiBusy ? <p className="mt-2 animate-pulse text-sm text-ink-soft">{labels.aiChecking}</p> : (
            <div className="prose prose-sm mt-2 max-w-none prose-p:my-1.5 prose-ul:my-1.5"><Markdown>{aiText}</Markdown></div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-mute">
            <span>{labels.aiReviewNote}</span>
            {!aiBusy && !locked && sub && <button type="button" onClick={runAi} className="font-semibold text-ink underline">{labels.aiRecheck}</button>}
          </div>
        </div>
      )}
      <form onSubmit={send} className="mt-5 space-y-3">
        <label className="label">{labels.yourAnswer}</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} disabled={locked} className="input bg-white" />
        {sub?.file_url && <a href={sub.file_url} target="_blank" className="block text-sm font-semibold underline">📎 {sub.file_name}</a>}
        {!locked && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-ghost btn-sm cursor-pointer bg-white">
              📎 {file ? file.name : labels.attach}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button disabled={busy || (!body.trim() && !file)} className="btn-dark btn-sm">{labels.send}</button>
            {msg && <span className="text-sm font-semibold">{msg}</span>}
          </div>
        )}
      </form>
    </div>
  );
}
