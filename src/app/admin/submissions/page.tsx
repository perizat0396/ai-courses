import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { adminLang } from '@/lib/admin-lang';
import { reviewSubmission } from '../actions';
import { ReviewForm } from '@/components/admin/ReviewForm';
import { aiEnabled } from '@/lib/gemini';

const LABEL = { submitted: ['На проверке', 'Тексерілуде'], needs_work: ['На доработке', 'Пысықтауда'], accepted: ['Принятые', 'Қабылданғандар'] } as const;

export default async function AdminSubmissions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: st } = await searchParams;
  const status = (st && st in LABEL ? st : 'submitted') as keyof typeof LABEL;
  const { supabase } = await requireAdmin();
  const { kk, L, T } = await adminLang();
  const { data } = await supabase
    .from('submissions')
    .select('*, profiles(full_name,email), lessons(title_ru, title_kk, courses(title_ru, title_kk))')
    .eq('status', status)
    .order('updated_at', { ascending: status === 'submitted' })
    .limit(100);
  const subs = (data ?? []) as {
    id: string; body: string; file_path: string | null; feedback: string; ai_feedback: string; updated_at: string; lesson_id: string;
    profiles: { full_name: string; email: string } | null;
    lessons: { title_ru: string; title_kk: string; courses: { title_ru: string; title_kk: string } | null } | null;
  }[];
  const withFiles = await Promise.all(subs.map(async (s) => {
    if (!s.file_path) return { ...s, url: null as string | null };
    const { data } = await supabase.storage.from('submissions').createSignedUrl(s.file_path, 3600);
    return { ...s, url: data?.signedUrl ?? null };
  }));

  return (
    <div className="space-y-6">
      <h1 className="h1">{L('Задания', 'Тапсырмалар')}</h1>
      <div className="flex gap-6 border-b border-line pb-3">
        {(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((k) => (
          <Link key={k} href={`/admin/submissions?status=${k}`} className={status === k ? 'tab-active' : 'tab'}>{L(LABEL[k][0], LABEL[k][1])}</Link>
        ))}
      </div>
      {withFiles.length === 0 && <p className="card p-6 text-sm text-ink-mute">{L('Здесь пока пусто.', 'Әзірге бос.')}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        {withFiles.map((s) => (
          <div key={s.id} className="card flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{s.profiles?.full_name || s.profiles?.email}</div>
                <div className="text-xs text-ink-mute">{T(s.lessons?.courses)} · <Link href={`/admin/lessons/${s.lesson_id}`} className="underline">{T(s.lessons)}</Link></div>
              </div>
              <span className="text-xs text-ink-mute">{new Date(s.updated_at).toLocaleString(kk ? 'kk-KZ' : 'ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-canvas p-4 text-sm">{s.body || '—'}</p>
            {s.url && <a href={s.url} target="_blank" className="mt-3 text-sm font-semibold underline">📎 {s.file_path?.split('/').pop()?.replace(/^\d+_/, '')}</a>}
            <ReviewForm id={s.id} feedback={s.feedback} aiFeedback={s.ai_feedback ?? ''} aiOn={aiEnabled()} kk={kk} action={reviewSubmission.bind(null, s.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
