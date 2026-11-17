'use client';
import { useActionState } from 'react';
import { createStudent, type CreateStudentState } from '@/app/admin/actions';
import { tr } from '@/lib/tr';

export function CreateStudentForm({ courses, kk }: { courses: { id: string; title: string }[]; kk?: boolean }) {
  const L = tr(kk);
  const [state, action, pending] = useActionState<CreateStudentState, FormData>(createStudent, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-lg font-bold">{L('Добавить студента', 'Студент қосу')}</h2>
      <p className="text-xs text-ink-soft">{L('Аккаунт создаётся сразу, без подтверждения email. Студенты также могут зарегистрироваться сами — тогда просто откройте им доступ в списке.', 'Аккаунт бірден, email растаусыз құрылады. Студенттер өздері де тіркеле алады — сонда тізімнен оларға қолжетімділік ашыңыз.')}</p>
      <div><label className="label">{L('Имя и фамилия', 'Аты-жөні')}</label><input name="full_name" className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">{L('Пароль', 'Құпиясөз')}</label><input name="password" required minLength={6} className="input" placeholder={L('минимум 6 символов', 'кемінде 6 таңба')} /></div>
      <div>
        <div className="label">{L('Открыть доступ к курсам', 'Курстарға қолжетімділік ашу')}</div>
        <div className="space-y-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="courses" value={c.id} className="accent-black" />{c.title}</label>
          ))}
        </div>
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">{state.ok}</p>}
      <button disabled={pending} className="btn-dark w-full">{pending ? L('Создаю…', 'Құрылуда…') : L('Создать студента', 'Студент құру')}</button>
    </form>
  );
}
