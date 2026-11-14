import { AppShell } from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getDict } from '@/lib/i18n';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const { t } = await getDict();
  return (
    <AppShell
      profile={profile}
      items={[
        { href: '/dashboard', label: t.dashboard, icon: 'grid' },
        { href: '/profile', label: t.profile, icon: 'user' },
      ]}
      switchTo={profile.role === 'admin' ? { href: '/admin', label: t.admin } : undefined}
    >
      {children}
    </AppShell>
  );
}
