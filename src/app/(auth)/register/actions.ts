'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { courseByCode } from '@/lib/join';
import { getLang } from '@/lib/i18n';

// Регистрация без подтверждения почты: аккаунт создаётся сразу подтверждённым и человек сразу входит
export async function registerNow(f: FormData): Promise<{ error?: string; go?: string }> {
  const kk = (await getLang()) === 'kk';
  const L = (ru: string, kz: string) => (kk ? kz : ru);
  const email = String(f.get('email') ?? '').trim().toLowerCase();
  const password = String(f.get('password') ?? '');
  const full_name = String(f.get('full_name') ?? '').trim();
  const code = String(f.get('code') ?? '').trim().toLowerCase();
  if (!email || password.length < 6) return { error: L('Укажите email и пароль (минимум 6 символов)', 'Email мен құпиясөзді көрсетіңіз (кемінде 6 таңба)') };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: L('Такой email уже зарегистрирован. Нажмите «Войти» ниже.', 'Бұл email тіркелген. Төмендегі «Кіру» батырмасын басыңыз.') };
    return { error: error.message };
  }

  let courseId: string | null = null;
  if (code) {
    courseId = await courseByCode(admin, code);
    if (courseId) await admin.from('enrollments').upsert({ user_id: data.user.id, course_id: courseId });
  }

  const supabase = await createClient();
  const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
  if (e2) return { error: e2.message };
  return { go: courseId ? `/courses/${courseId}` : '/dashboard' };
}
