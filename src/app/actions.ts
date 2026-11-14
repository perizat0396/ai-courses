'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function setLang(lang: 'ru' | 'kk') {
  (await cookies()).set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function toggleLessonDone(lessonId: string, done: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (done) {
    await supabase.from('lesson_progress').upsert({ user_id: user.id, lesson_id: lessonId });
  } else {
    await supabase.from('lesson_progress').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
  }
  revalidatePath('/', 'layout');
}

export async function updateMyName(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ full_name: String(formData.get('full_name') ?? '').trim() }).eq('id', user.id);
  revalidatePath('/', 'layout');
}
