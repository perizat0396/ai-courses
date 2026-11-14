import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export type Profile = { id: string; email: string | null; full_name: string; role: 'admin' | 'student' };

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from('profiles').select('id,email,full_name,role').eq('id', user.id).single();
  return { supabase, user, profile: profile as Profile | null };
}

export async function requireUser() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect('/login');
  return s as typeof s & { profile: Profile };
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.profile.role !== 'admin') redirect('/dashboard');
  return s;
}
