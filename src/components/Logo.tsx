export function Logo({ dark = true, name = 'AI Курсы' }: { dark?: boolean; name?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid h-10 w-10 rotate-45 place-items-center rounded-xl ${dark ? 'bg-ink' : 'bg-brand'}`}>
        <span className={`-rotate-45 text-sm font-extrabold ${dark ? 'text-brand' : 'text-ink'}`}>AI</span>
      </div>
      <span className="text-base font-bold tracking-tight">{name}</span>
    </div>
  );
}
