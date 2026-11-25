import { AuthForm } from '@/components/AuthForm';
import { getDict } from '@/lib/i18n';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = '' } = await searchParams;
  const { t } = await getDict();
  const { youHaveCourses: _omit, ...rest } = t;
  return <AuthForm mode="login" t={rest} code={code.slice(0, 40)} />;
}
