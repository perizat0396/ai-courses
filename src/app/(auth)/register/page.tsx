import { AuthForm } from '@/components/AuthForm';
import { getDict } from '@/lib/i18n';

export default async function RegisterPage() {
  const { t } = await getDict();
  const { youHaveCourses: _omit, ...rest } = t;
  return <AuthForm mode="register" t={rest} />;
}
