'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dict } from '@/lib/i18n';

type T = Omit<Dict, 'youHaveCourses'>;

export function AuthForm({ mode, t }: { mode: 'login' | 'register'; t: T }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim();
    const password = String(f.get('password'));
    const supabase = createClient();
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message === 'Invalid login credentials' ? t.badLogin : error.message); setBusy(false); return; }
      router.replace('/');
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: String(f.get('full_name')).trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) { setError(error.message); setBusy(false); return; }
      if (data.session) { router.replace('/dashboard'); router.refresh(); return; }
      setInfo(t.registerDone);
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="h1">{mode === 'login' ? t.loginTitle : t.createAccount}</h2>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {mode === 'register' && (
          <div><label className="label">{t.fullName}</label><input name="full_name" required className="input" /></div>
        )}
        <div><label className="label">{t.email}</label><input name="email" type="email" required className="input" autoComplete="email" /></div>
        <div><label className="label">{t.password}</label><input name="password" type="password" required minLength={6} className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">{info}</p>}
        <button disabled={busy} className="btn-dark w-full">{mode === 'login' ? t.login : t.createAccount}</button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        {mode === 'login' ? t.noAccount : t.haveAccount}{' '}
        <Link href={mode === 'login' ? '/register' : '/login'} className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4">
          {mode === 'login' ? t.register : t.login}
        </Link>
      </p>
    </div>
  );
}
