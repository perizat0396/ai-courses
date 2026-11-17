import { setAccess } from '@/app/admin/actions';
import { tr } from '@/lib/tr';

export function AccessToggle({ userId, courseId, on, label, kk }: { userId: string; courseId: string; on: boolean; label: string; kk?: boolean }) {
  const L = tr(kk);
  return (
    <form action={setAccess.bind(null, userId, courseId, !on)}>
      <button
        title={on ? L('Нажмите, чтобы закрыть доступ', 'Қолжетімділікті жабу үшін басыңыз') : L('Нажмите, чтобы открыть доступ', 'Қолжетімділікті ашу үшін басыңыз')}
        className={`chip gap-1.5 border transition ${on ? 'border-ink bg-ink text-white hover:bg-black/70' : 'border-line bg-white text-ink-soft hover:border-ink hover:text-ink'}`}
      >
        <span className={`h-2 w-2 rounded-full ${on ? 'bg-brand' : 'bg-line'}`} />
        {label}
      </button>
    </form>
  );
}
