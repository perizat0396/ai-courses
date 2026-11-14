import { AppShell } from '@/components/AppShell';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin();
  const { count } = await supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted');
  return (
    <AppShell
      profile={profile}
      items={[
        { href: '/admin', label: 'Обзор', icon: 'grid', exact: true },
        { href: '/admin/courses', label: 'Курсы', icon: 'book' },
        { href: '/admin/students', label: 'Студенты', icon: 'users' },
        { href: '/admin/submissions', label: 'Задания', icon: 'inbox', badge: count ?? 0 },
      ]}
      switchTo={{ href: '/dashboard', label: 'Режим студента' }}
    >
      {children}
    </AppShell>
  );
}
