'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconCheck, IconGrid, IconInbox, IconUser, IconUsers } from './Icons';

const icons = { grid: IconGrid, book: IconBook, users: IconUsers, inbox: IconInbox, user: IconUser, check: IconCheck };
export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-2">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + '/');
        const Icon = icons[it.icon];
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition lg:-ml-8 lg:rounded-l-none lg:pl-8 ${
              active ? 'bg-ink text-white' : 'text-ink hover:bg-canvas'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-brand' : ''}`} />
            <span>{it.label}</span>
            {!!it.badge && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-ink">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
