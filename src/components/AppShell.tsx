import Link from 'next/link';
import { Logo } from './Logo';
import { NavLinks, type NavItem } from './NavLinks';
import { LangSwitch } from './LangSwitch';
import { IconLogout } from './Icons';
import { signOut } from '@/app/actions';
import { getDict } from '@/lib/i18n';
import type { Profile } from '@/lib/auth';

export async function AppShell({
  profile, items, children, switchTo,
}: { profile: Profile; items: NavItem[]; children: React.ReactNode; switchTo?: { href: string; label: string } }) {
  const { lang, t } = await getDict();
  const name = profile.full_name || profile.email || '';
  const initials = name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-white lg:flex">
      <aside className="border-b border-line bg-white px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
        <div className="mb-4 flex items-center justify-between lg:mb-14">
          <Link href="/"><Logo /></Link>
          <div className="lg:hidden"><LangSwitch lang={lang} /></div>
        </div>
        <NavLinks items={items} />
        <div className="mt-auto hidden space-y-3 lg:block">
          {switchTo && (
            <Link href={switchTo.href} className="block rounded-xl border border-line px-4 py-3 text-xs font-semibold hover:bg-canvas">
              {switchTo.label} →
            </Link>
          )}
          <form action={signOut}>
            <button className="flex items-center gap-2 px-1 text-sm font-semibold text-ink-soft hover:text-ink">
              <IconLogout className="h-4 w-4" /> {t.logout}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <header className="hidden items-center justify-end gap-5 px-10 pt-8 lg:flex">
          <LangSwitch lang={lang} />
          <Link href="/profile" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-brand text-sm font-bold">{initials || '?'}</div>
            <div className="leading-tight">
              <div className="text-sm font-bold">{name}</div>
              <div className="text-xs text-ink-mute">{profile.role === 'admin' ? 'Администратор' : profile.email}</div>
            </div>
          </Link>
        </header>
        <main className="px-4 py-6 md:px-10 lg:py-8">{children}</main>
        <div className="flex items-center justify-between border-t border-line px-4 py-4 lg:hidden">
          {switchTo ? <Link href={switchTo.href} className="text-xs font-semibold">{switchTo.label} →</Link> : <span />}
          <form action={signOut}><button className="text-xs font-semibold text-ink-soft">{t.logout}</button></form>
        </div>
      </div>
    </div>
  );
}
