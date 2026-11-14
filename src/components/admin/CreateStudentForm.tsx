'use client';
import { useActionState } from 'react';
import { createStudent, type CreateStudentState } from '@/app/admin/actions';

export function CreateStudentForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<CreateStudentState, FormData>(createStudent, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-lg font-bold">Добавить студента</h2>
      <p className="text-xs text-ink-soft">Аккаунт создаётся сразу, без подтверждения email. Студенты также могут зарегистрироваться сами — тогда просто откройте им доступ в списке.</p>
      <div><label className="label">Имя и фамилия</label><input name="full_name" className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Пароль</label><input name="password" required minLength={6} className="input" placeholder="минимум 6 символов" /></div>
      <div>
        <div className="label">Открыть доступ к курсам</div>
        <div className="space-y-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="courses" value={c.id} className="accent-black" />{c.title}</label>
          ))}
        </div>
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">{state.ok}</p>}
      <button disabled={pending} className="btn-dark w-full">{pending ? 'Создаю…' : 'Создать студента'}</button>
    </form>
  );
}
