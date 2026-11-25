import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

// QR-ссылка на курс: новый человек → регистрация с кодом, вошедший → сразу доступ к курсу
export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toLowerCase().slice(0, 40);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/register?code=${encodeURIComponent(code)}`);
  const { data: courseId } = await supabase.rpc('join_course', { p_code: code });
  if (courseId) redirect(`/courses/${courseId}`);
  const { t } = await getDict();
  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{t.joinBad}</p>
      <a href="/dashboard" className="btn-dark mt-6 inline-block">{t.dashboard}</a>
    </main>
  );
}
