'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addLessonFile, setLessonVideoPath } from '@/app/admin/actions';

const safeName = (n: string) => n.replace(/[^\wа-яА-ЯёЁәғқңөұүһіӘҒҚҢӨҰҮҺІ.\-]+/g, '_');
const asciiKey = (n: string) => `${Date.now()}_${n.normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(-80)}`;

export function FileUploader({ lessonId }: { lessonId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true); setMsg('');
    const supabase = createClient();
    for (const file of files) {
      const path = `${lessonId}/${asciiKey(file.name)}`;
      const { error } = await supabase.storage.from('lesson-files').upload(path, file);
      if (error) { setMsg(`${file.name}: ${error.message}`); continue; }
      await addLessonFile(lessonId, safeName(file.name), path, file.size);
    }
    setBusy(false);
    e.target.value = '';
  }
  return (
    <div className="flex items-center gap-3">
      <label className={`btn-dark btn-sm cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Загрузка…' : '+ Загрузить файлы'}
        <input type="file" multiple className="hidden" disabled={busy} onChange={onChange} />
      </label>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

export function VideoUploader({ lessonId, current }: { lessonId: string; current: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg('Загрузка видео… не закрывайте страницу');
    const path = `${lessonId}/video/${asciiKey(file.name)}`;
    const { error } = await createClient().storage.from('lesson-files').upload(path, file, { contentType: file.type });
    if (error) { setMsg(error.message.includes('maximum') ? 'Файл слишком большой для вашего тарифа Supabase. Загрузите видео на YouTube (доступ по ссылке) и вставьте ссылку.' : error.message); setBusy(false); return; }
    await setLessonVideoPath(lessonId, path);
    setMsg('Видео загружено'); setBusy(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={`btn-ghost btn-sm cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Загрузка…' : current ? 'Заменить видеофайл' : 'Загрузить видеофайл'}
        <input type="file" accept="video/*" className="hidden" disabled={busy} onChange={onChange} />
      </label>
      {current && !busy && (
        <button type="button" className="text-xs font-semibold text-red-600" onClick={async () => { if (confirm('Удалить загруженное видео?')) { await setLessonVideoPath(lessonId, null); setMsg(''); } }}>
          Удалить видеофайл
        </button>
      )}
      {current && <span className="text-xs text-ink-mute">📹 {current.split('/').pop()}</span>}
      {msg && <span className="text-xs font-semibold">{msg}</span>}
    </div>
  );
}
