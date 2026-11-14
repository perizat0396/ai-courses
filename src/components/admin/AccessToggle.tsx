import { setAccess } from '@/app/admin/actions';

export function AccessToggle({ userId, courseId, on, label }: { userId: string; courseId: string; on: boolean; label: string }) {
  return (
    <form action={setAccess.bind(null, userId, courseId, !on)}>
      <button
        title={on ? 'Нажмите, чтобы закрыть доступ' : 'Нажмите, чтобы открыть доступ'}
        className={`chip gap-1.5 border transition ${on ? 'border-ink bg-ink text-white hover:bg-black/70' : 'border-line bg-white text-ink-soft hover:border-ink hover:text-ink'}`}
      >
        <span className={`h-2 w-2 rounded-full ${on ? 'bg-brand' : 'bg-line'}`} />
        {label}
      </button>
    </form>
  );
}
