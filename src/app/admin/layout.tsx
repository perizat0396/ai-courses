import { AppShell } from '@/components/AppShell';
import { requireAdmin } from '@/lib/auth';
import { adminLang } from '@/lib/admin-lang';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin();
  const { L } = await adminLang();
  const { count } = await supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted');
  return (
    <AppShell
      profile={profile}
      items={[
        { href: '/admin', label: L('Обзор', 'Шолу'), icon: 'grid', exact: true },
        { href: '/admin/courses', label: L('Курсы', 'Курстар'), icon: 'book' },
        { href: '/admin/students', label: L('Студенты', 'Студенттер'), icon: 'users' },
        { href: '/admin/submissions', label: L('Задания', 'Тапсырмалар'), icon: 'inbox', badge: count ?? 0 },
      ]}
      switchTo={{ href: '/dashboard', label: L('Режим студента', 'Студент режимі') }}
    >
      {children}
    </AppShell>
  );
}
